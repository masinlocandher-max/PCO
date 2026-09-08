"""The only place in this module that can talk to LinkedIn — and by default, does not.

Read this before changing anything here.

**What is honestly possible.** LinkedIn does not hand out posting access to
individuals. Writing to a personal profile needs the Community Management API,
which needs an approved LinkedIn Developer application and a partnership review.
Until FMB has that, there is no supported way for software to post as her, and
anything that claims otherwise is either scraping her own account with a stolen
session cookie — which violates LinkedIn's terms and risks the account this
whole system exists to protect — or it is lying.

So this client is built the other way round. Its normal, expected, everyday mode
is **prepare**: it produces the exact text, formatted and checked, for FMB to
paste and post herself. That is not a limitation to work around. For a personal
brand where reputation is the asset, a human pressing publish is the correct
design, not a stopgap.

The API path exists, is fully gated, and stays off until three separate things
are true. If FMB is ever granted API access, nothing above this file changes.

**The gates**, all of which must pass before a single byte leaves the machine:

1. ``FMB_ALLOW_EXTERNAL`` is on.
2. ``FMB_EXECUTE_FOR_REAL`` is on (otherwise every call is a dry run).
3. A ``Permit`` from ``approval_manager.claim()`` — which only exists if a named
   human approved this exact text, recently, and it has not been used before.

There is no fourth way in. There is no "just this once" argument, no flag that
skips the permit, and no default that is unsafe.
"""

from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass, field
from typing import Any

from . import db
from .approval_manager import Permit
from .config import redact, settings

#: LinkedIn truncates a post in the feed past roughly this; the hard cap is
#: higher but the reading experience is not.
FEED_TRUNCATION = 210
HARD_LIMIT = 3000
COMMENT_LIMIT = 1250


class LinkedInError(RuntimeError):
    """Raised when an outward action is refused or fails."""


@dataclass
class Prepared:
    """Text ready for FMB to post herself, plus what to check before she does."""

    action: str
    text: str
    target: str | None = None
    warnings: list[str] = field(default_factory=list)
    character_count: int = 0
    truncated_preview: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "action": self.action,
            "text": self.text,
            "target": self.target,
            "warnings": self.warnings,
            "character_count": self.character_count,
            "truncated_preview": self.truncated_preview,
            "how_to_use": "Copy the text above and post it yourself. "
                          "Nothing here posts on your behalf.",
        }


def _check(text: str, *, limit: int, kind: str) -> list[str]:
    warnings: list[str] = []
    stripped = text.strip()
    if not stripped:
        warnings.append(f"the {kind} is empty")
    if len(stripped) > limit:
        warnings.append(f"{len(stripped)} characters, over LinkedIn's {limit} limit for a {kind}")
    if kind == "post" and len(stripped) > FEED_TRUNCATION:
        warnings.append(
            f"the feed shows about the first {FEED_TRUNCATION} characters — "
            "make sure the opening earns the click"
        )
    if stripped.count("#") > 5:
        warnings.append("more than five hashtags reads as reach-chasing rather than a point of view")
    if "http://" in stripped:
        warnings.append("an insecure http:// link — use https://")
    return warnings


def prepare_post(text: str) -> Prepared:
    """The normal path. Format and check a post for FMB to publish herself."""

    stripped = text.strip()
    return Prepared(
        action="publish_post",
        text=stripped,
        warnings=_check(stripped, limit=HARD_LIMIT, kind="post"),
        character_count=len(stripped),
        truncated_preview=stripped[:FEED_TRUNCATION] + ("…" if len(stripped) > FEED_TRUNCATION else ""),
    )


def prepare_comment(text: str, *, target: str | None = None) -> Prepared:
    """Format and check a reply for FMB to leave herself."""

    stripped = text.strip()
    return Prepared(
        action="publish_comment",
        text=stripped,
        target=target,
        warnings=_check(stripped, limit=COMMENT_LIMIT, kind="comment"),
        character_count=len(stripped),
        truncated_preview=stripped[:FEED_TRUNCATION] + ("…" if len(stripped) > FEED_TRUNCATION else ""),
    )


def capability() -> dict[str, Any]:
    """An honest account of what this client can do right now, and why."""

    has_token = bool(os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip())
    return {
        "can_prepare": True,
        "can_publish": bool(settings.allow_external and not settings.dry_run and has_token),
        "allow_external": settings.allow_external,
        "dry_run": settings.dry_run,
        "api_credential_present": has_token,   # whether, never what
        "why": (
            "Publishing needs LinkedIn's Community Management API, which needs an approved "
            "developer application. Without it the supported path is prepare-and-paste, and "
            "that is the default here. Even with it, every publish needs a claimed approval."
        ),
    }


def publish(conn: sqlite3.Connection, permit: Permit) -> dict[str, Any]:
    """Attempt the one action a permit authorises.

    Refuses unless every gate is open, and records the refusal either way. In
    dry-run — the default — it reports exactly what it would have sent and sends
    nothing.
    """

    if permit.action_type not in ("publish_post", "publish_comment"):
        _refuse(conn, permit, f"this client does not perform {permit.action_type}")

    if not settings.allow_external:
        _refuse(conn, permit, "FMB_ALLOW_EXTERNAL is off, so nothing leaves this machine")

    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()
    if not token:
        _refuse(conn, permit,
                "no LinkedIn API credential is configured — use the prepared text and post it yourself")

    if settings.dry_run:
        # The safe default. Everything above passed; this is what would happen.
        with db.transaction(conn):
            db.log(conn, "external:dry_run", entity="approvals",
                   entity_id=permit.approval_id, approval_id=permit.approval_id,
                   detail=f"{permit.action_type} to {permit.target or 'own feed'}")
        return {
            "sent": False,
            "dry_run": True,
            "would_send": permit.payload,
            "target": permit.target,
            "note": "Set FMB_EXECUTE_FOR_REAL=1 to arm this. Nothing was sent.",
        }

    # ── Live path ───────────────────────────────────────────────────────────
    # Reached only with an approved, unspent permit, external actions allowed,
    # execution armed, and a credential present. The credential is read here and
    # never stored, logged or returned.
    try:
        response = _call_linkedin(token, permit)
    except Exception as exc:  # noqa: BLE001 - reported, redacted, never swallowed
        with db.transaction(conn):
            db.log(conn, "external:error", entity="approvals", entity_id=permit.approval_id,
                   approval_id=permit.approval_id, outcome="error", detail=redact(exc))
        raise LinkedInError(redact(f"the action could not be completed: {exc}")) from exc

    with db.transaction(conn):
        db.log(conn, "external:published", entity="approvals", entity_id=permit.approval_id,
               approval_id=permit.approval_id,
               detail=f"{permit.action_type} -> {response.get('id', 'unknown id')}")
    return {"sent": True, "dry_run": False, "response": response}


def _refuse(conn: sqlite3.Connection, permit: Permit, reason: str) -> None:
    with db.transaction(conn):
        db.log(conn, "external:refused", entity="approvals", entity_id=permit.approval_id,
               approval_id=permit.approval_id, outcome="refused", detail=reason)
    raise LinkedInError(redact(reason))


def _call_linkedin(token: str, permit: Permit) -> dict[str, Any]:
    """The single HTTP call.

    Isolated in one small function so the live path is easy to read, easy to
    review and easy to stub in tests. urllib rather than a dependency, because a
    module that touches FMB's reputation should have as little third-party code
    in its outward path as possible.
    """

    import urllib.error
    import urllib.request

    author = os.environ.get("LINKEDIN_AUTHOR_URN", "").strip()
    if not author:
        raise LinkedInError("LINKEDIN_AUTHOR_URN is not set, so there is no author to post as")

    body = json.dumps({
        "author": author,
        "commentary": permit.payload,
        "visibility": "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED"},
        "lifecycleState": "PUBLISHED",
    }).encode("utf-8")

    request = urllib.request.Request(
        "https://api.linkedin.com/rest/posts",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "LinkedIn-Version": os.environ.get("LINKEDIN_API_VERSION", "202411"),
            "X-Restli-Protocol-Version": "2.0.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as resp:
            raw = resp.read().decode("utf-8") or "{}"
            return {"status": resp.status, "id": resp.headers.get("x-restli-id"),
                    "body": json.loads(raw) if raw.strip().startswith("{") else raw}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        raise LinkedInError(redact(f"LinkedIn returned {exc.code}: {detail}")) from exc
