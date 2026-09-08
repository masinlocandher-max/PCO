"""The approval gate.

Nothing in this module reaches the outside world. Its whole job is to make sure
that when something else tries to, there is a human decision behind it.

The shape is deliberately narrow:

    draft(...)          -> a record of what the assistant proposes
    submit(id)          -> FMB is asked to look at it
    approve(id, by=...) -> a person, named, says yes
    reject(id, by=...)  -> a person, named, says no
    claim(id)           -> the caller is handed a one-time token to act on

`claim` is the only way to get permission to act, it only works once, and it
only works on an approved record. Everything else is bookkeeping.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from . import db
from .config import redact, settings

ActionType = Literal["publish_post", "publish_comment", "send_message",
                     "send_connection", "external_share", "other"]
Risk = Literal["low", "medium", "high"]

VALID_ACTIONS = ("publish_post", "publish_comment", "send_message",
                 "send_connection", "external_share", "other")
VALID_RISKS = ("low", "medium", "high")

#: Approvals go stale. An approval FMB gave three weeks ago was given about a
#: world that has moved on, so it stops counting.
APPROVAL_TTL_HOURS = 72


class ApprovalError(RuntimeError):
    """Raised when an approval is missing, stale, spent, or malformed."""


@dataclass(frozen=True)
class Permit:
    """A one-time permission to perform exactly one external action."""

    approval_id: int
    action_type: str
    payload: str
    target: str | None


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _get(conn: sqlite3.Connection, approval_id: int) -> dict:
    row = db.one(conn, "SELECT * FROM approvals WHERE id = ?", (approval_id,))
    if row is None:
        raise ApprovalError(f"approval {approval_id} does not exist")
    return row


def draft(
    conn: sqlite3.Connection,
    *,
    action_type: ActionType,
    subject: str,
    payload: str,
    target: str | None = None,
    risk: Risk = "medium",
    risk_notes: str | None = None,
) -> int:
    """Record something the assistant proposes to do. Nothing happens yet."""

    if action_type not in VALID_ACTIONS:
        raise ApprovalError(f"unknown action type: {action_type!r}")
    if risk not in VALID_RISKS:
        raise ApprovalError(f"unknown risk level: {risk!r}")
    if not subject.strip():
        raise ApprovalError("an approval needs a subject line a human can read")
    if not payload.strip():
        raise ApprovalError("an approval needs the exact text that would go out")

    with db.transaction(conn):
        cur = conn.execute(
            "INSERT INTO approvals (action_type, subject, payload, target, risk, risk_notes, status)"
            " VALUES (?, ?, ?, ?, ?, ?, 'draft')",
            (action_type, subject.strip(), payload, target, risk, risk_notes),
        )
        approval_id = int(cur.lastrowid)
        db.log(conn, "approval:draft", entity="approvals", entity_id=approval_id,
               approval_id=approval_id, detail=subject.strip())
    return approval_id


def submit(conn: sqlite3.Connection, approval_id: int) -> dict:
    """Put a draft in front of FMB."""

    row = _get(conn, approval_id)
    if row["status"] not in ("draft", "rejected"):
        raise ApprovalError(
            f"approval {approval_id} is {row['status']}, which is not something to resubmit"
        )
    with db.transaction(conn):
        conn.execute(
            "UPDATE approvals SET status = 'pending_review', updated_at = ? WHERE id = ?",
            (_now(), approval_id),
        )
        db.log(conn, "approval:submit", entity="approvals", entity_id=approval_id,
               approval_id=approval_id)
    return _get(conn, approval_id)


def approve(conn: sqlite3.Connection, approval_id: int, *,
            by: str | None = None, notes: str | None = None) -> dict:
    """Record a human yes.

    `by` is required in substance even though it has a default: the default is
    the configured operator, and an approval with no identifiable decider is
    refused rather than attributed to nobody.
    """

    decider = (by or settings.operator or "").strip()
    if not decider or decider == "unknown":
        raise ApprovalError(
            "an approval must name the person making it — set FMB_OPERATOR or pass by=..."
        )
    row = _get(conn, approval_id)
    if row["status"] != "pending_review":
        raise ApprovalError(
            f"approval {approval_id} is {row['status']}; only a record under review can be approved"
        )
    with db.transaction(conn):
        conn.execute(
            "UPDATE approvals SET status = 'approved', decided_by = ?, decided_at = ?,"
            " decision_notes = ?, updated_at = ? WHERE id = ?",
            (decider, _now(), notes, _now(), approval_id),
        )
        db.log(conn, "approval:approve", actor="fmb", entity="approvals",
               entity_id=approval_id, approval_id=approval_id, detail=decider)
    return _get(conn, approval_id)


def reject(conn: sqlite3.Connection, approval_id: int, *,
           by: str | None = None, notes: str | None = None) -> dict:
    """Record a human no. A rejected record can be redrafted and resubmitted."""

    decider = (by or settings.operator or "").strip() or "unknown"
    row = _get(conn, approval_id)
    if row["status"] in ("executed",):
        raise ApprovalError(f"approval {approval_id} has already been acted on")
    with db.transaction(conn):
        conn.execute(
            "UPDATE approvals SET status = 'rejected', decided_by = ?, decided_at = ?,"
            " decision_notes = ?, updated_at = ? WHERE id = ?",
            (decider, _now(), notes, _now(), approval_id),
        )
        db.log(conn, "approval:reject", actor="fmb", entity="approvals",
               entity_id=approval_id, approval_id=approval_id, detail=notes)
    return _get(conn, approval_id)


def _stale(row: dict) -> bool:
    if not row.get("decided_at"):
        return True
    try:
        decided = datetime.strptime(row["decided_at"], "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )
    except (TypeError, ValueError):
        return True
    age_hours = (datetime.now(timezone.utc) - decided).total_seconds() / 3600
    return age_hours > APPROVAL_TTL_HOURS


def claim(conn: sqlite3.Connection, approval_id: int) -> Permit:
    """Hand out the one-time permission to perform this action.

    Refuses an approval that was never approved, that has already been spent,
    or that is older than the time-to-live. The row is marked executed as part
    of the same transaction that issues the permit, so two callers racing for
    the same approval cannot both act on it.
    """

    row = _get(conn, approval_id)

    if row["status"] == "executed":
        _refuse(conn, approval_id, "approval has already been used")
    if row["status"] != "approved":
        _refuse(conn, approval_id, f"approval is {row['status']}, not approved")
    if _stale(row):
        with db.transaction(conn):
            conn.execute("UPDATE approvals SET status = 'expired', updated_at = ? WHERE id = ?",
                         (_now(), approval_id))
        _refuse(conn, approval_id,
                f"approval is older than {APPROVAL_TTL_HOURS}h and has expired")

    with db.transaction(conn):
        changed = conn.execute(
            "UPDATE approvals SET status = 'executed', executed_at = ?, updated_at = ?"
            " WHERE id = ? AND status = 'approved'",
            (_now(), _now(), approval_id),
        ).rowcount
        if changed != 1:
            raise ApprovalError(f"approval {approval_id} was claimed by someone else first")
        db.log(conn, "approval:claim", entity="approvals", entity_id=approval_id,
               approval_id=approval_id)

    return Permit(
        approval_id=approval_id,
        action_type=row["action_type"],
        payload=row["payload"],
        target=row["target"],
    )


def _refuse(conn: sqlite3.Connection, approval_id: int, reason: str) -> None:
    with db.transaction(conn):
        db.log(conn, "approval:refused", entity="approvals", entity_id=approval_id,
               approval_id=approval_id, outcome="refused", detail=reason)
    raise ApprovalError(redact(reason))


def queue(conn: sqlite3.Connection, status: str | None = "pending_review") -> list[dict]:
    """What is waiting for FMB, newest first."""

    if status:
        return db.rows(conn,
                       "SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC",
                       (status,))
    return db.rows(conn, "SELECT * FROM approvals ORDER BY created_at DESC")


def audit(conn: sqlite3.Connection, limit: int = 100) -> list[dict]:
    return db.rows(conn, "SELECT * FROM activity_logs ORDER BY at DESC, id DESC LIMIT ?",
                   (max(1, min(int(limit), 1000)),))
