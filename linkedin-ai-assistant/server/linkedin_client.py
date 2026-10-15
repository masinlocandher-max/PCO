"""The only place in this module that can talk to LinkedIn.

Two modes. There is no third, and specifically there is no mode that drives a
logged-in browser session.

**MODE 1 — ``prepare_and_paste`` (the default).**
The assistant produces the final text and checks it: length against LinkedIn's
limit, the feed-truncation point, hashtag count, link safety. FMB publishes it
herself. This is the safe default and it stays the default; it is not a
placeholder waiting to be replaced.

**MODE 2 — ``official_linkedin_api``.**
Publishing through an approved LinkedIn developer application, over OAuth, using
LinkedIn's own APIs. Fully supported here, and disabled until every one of these
is true — checked at call time, not assumed:

1. ``FMB_PUBLISH_MODE=official_linkedin_api`` — FMB explicitly enabled it.
2. ``LINKEDIN_CLIENT_ID`` — an official developer application exists.
3. ``LINKEDIN_ACCESS_TOKEN`` — OAuth is configured and a token was obtained.
4. ``LINKEDIN_SCOPES`` declares ``w_member_social`` — the permission LinkedIn
   must have approved for the app. Declared, then verified against the API's
   answer; a 403 is treated as "the permission was not actually granted".
5. ``LINKEDIN_AUTHOR_URN`` — an author to post as.
6. ``FMB_ALLOW_EXTERNAL=1`` — the master switch for anything outward.
7. ``FMB_EXECUTE_FOR_REAL=1`` — otherwise every call is a dry run.
8. A ``Permit`` from ``approval_manager.claim()`` — a named human approved this
   exact text, recently, and the approval has not been spent.

``readiness()`` reports each of those as passed or not, so the path from mode 1
to mode 2 is a checklist rather than a guess.

**What is refused outright.** Session cookies, ``li_at`` or any other browser
token, headless-browser automation of a logged-in account, and unofficial
endpoints. Not "not yet" — never. Those risk the account this entire system
exists to protect, and there is no version of this file that contains one. A
test asserts that, and ``_refuse_unofficial()`` raises if such a credential is
even present in the environment.
"""

from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass, field
from typing import Any

from . import db
from .approval_manager import Permit
from .config import (MODE_OFFICIAL_API, MODE_PREPARE, REQUIRED_SCOPE, redact,
                     settings)

#: LinkedIn truncates a post in the feed past roughly this; the hard cap is
#: higher but the reading experience is not.
FEED_TRUNCATION = 210
HARD_LIMIT = 3000
COMMENT_LIMIT = 1250

#: Environment names that would only exist if somebody were attempting
#: unofficial automation. Their presence is an error, not a fallback.
UNOFFICIAL_MARKERS = ("LINKEDIN_COOKIE", "LI_AT", "LINKEDIN_LI_AT",
                      "LINKEDIN_SESSION_COOKIE", "LINKEDIN_JSESSIONID")


class LinkedInError(RuntimeError):
    """Raised when an outward action is refused or fails."""


class UnofficialAutomationRefused(LinkedInError):
    """Raised when cookie or session-based automation is attempted."""


def _refuse_unofficial() -> None:
    """Refuse to run at all if an unofficial credential is configured.

    Deliberately fails loudly rather than ignoring the variable. Somebody who
    has set ``LI_AT`` intends to automate a logged-in session, and the right
    moment to say no is before anything else happens.
    """

    found = [name for name in UNOFFICIAL_MARKERS if os.environ.get(name, "").strip()]
    if found:
        raise UnofficialAutomationRefused(
            "cookie or session-based LinkedIn automation is not supported and will not be "
            f"added: {', '.join(found)} is set. Use MODE 2 with an approved developer "
            "application and OAuth, or stay in prepare_and_paste."
        )


@dataclass
class Prepared:
    """Text ready to publish, plus what to check before it goes."""

    action: str
    text: str
    target: str | None = None
    warnings: list[str] = field(default_factory=list)
    character_count: int = 0
    truncated_preview: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "mode": settings.publish_mode,
            "action": self.action,
            "text": self.text,
            "target": self.target,
            "warnings": self.warnings,
            "character_count": self.character_count,
            "truncated_preview": self.truncated_preview,
            "how_to_use": (
                "Copy the text above and post it yourself. Nothing here posts on your behalf."
                if settings.publish_mode == MODE_PREPARE else
                "Official API mode is selected. This text still needs an approval, "
                "and publish() re-checks every gate before anything is sent."
            ),
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
    """MODE 1. Format and check a post."""

    stripped = text.strip()
    return Prepared(
        action="publish_post",
        text=stripped,
        warnings=_check(stripped, limit=HARD_LIMIT, kind="post"),
        character_count=len(stripped),
        truncated_preview=stripped[:FEED_TRUNCATION] + ("…" if len(stripped) > FEED_TRUNCATION else ""),
    )


def prepare_comment(text: str, *, target: str | None = None) -> Prepared:
    """MODE 1. Format and check a reply."""

    stripped = text.strip()
    return Prepared(
        action="publish_comment",
        text=stripped,
        target=target,
        warnings=_check(stripped, limit=COMMENT_LIMIT, kind="comment"),
        character_count=len(stripped),
        truncated_preview=stripped[:FEED_TRUNCATION] + ("…" if len(stripped) > FEED_TRUNCATION else ""),
    )


# ── Mode 2 readiness ────────────────────────────────────────────────────────

def _declared_scopes() -> set[str]:
    raw = os.environ.get("LINKEDIN_SCOPES", "")
    return {s.strip() for s in raw.replace(",", " ").split() if s.strip()}


def readiness() -> dict[str, Any]:
    """Every gate between here and official API publishing, and its state.

    Reports presence, never values. Written so the roadmap in the README can be
    read off a live system rather than trusted.
    """

    checks = [
        ("fmb_enabled_official_mode", settings.publish_mode == MODE_OFFICIAL_API,
         "FMB_PUBLISH_MODE=official_linkedin_api"),
        ("developer_application", bool(os.environ.get("LINKEDIN_CLIENT_ID", "").strip()),
         "an approved LinkedIn developer application (LINKEDIN_CLIENT_ID)"),
        ("oauth_token", bool(os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()),
         "an OAuth access token obtained through the official flow"),
        ("permission_declared", REQUIRED_SCOPE in _declared_scopes(),
         f"LINKEDIN_SCOPES declares {REQUIRED_SCOPE}"),
        ("author_identified", bool(os.environ.get("LINKEDIN_AUTHOR_URN", "").strip()),
         "LINKEDIN_AUTHOR_URN"),
        ("external_actions_allowed", settings.allow_external, "FMB_ALLOW_EXTERNAL=1"),
        ("execution_armed", not settings.dry_run, "FMB_EXECUTE_FOR_REAL=1"),
    ]
    outstanding = [label for _, ok, label in checks if not ok]
    return {
        "mode": settings.publish_mode,
        "checks": {name: ok for name, ok, _ in checks},
        "outstanding": outstanding,
        "can_publish_via_api": not outstanding,
        "note": ("A ninth requirement is not listed because it is per-action: every publish "
                 "also needs a claimed approval for that exact text."),
    }


def capability() -> dict[str, Any]:
    """What this client can do right now, and under which mode."""

    ready = readiness()
    return {
        "mode": settings.publish_mode,
        "mode_1_prepare_and_paste": True,
        "mode_2_official_api_available": ready["can_publish_via_api"],
        "outstanding_for_mode_2": ready["outstanding"],
        "unofficial_automation": "refused — cookies, session tokens and headless "
                                 "automation of a logged-in account are never supported",
        "per_action_requirement": "a claimed approval for the exact text",
    }


# ── Publishing ──────────────────────────────────────────────────────────────

def publish(conn: sqlite3.Connection, permit: Permit) -> dict[str, Any]:
    """Perform the one action a permit authorises, under the current mode.

    In MODE 1 this does not send: it returns the prepared text and says so.
    In MODE 2 it re-checks every gate, then calls LinkedIn's official API.
    Either way a refusal is recorded before the exception is raised.
    """

    _refuse_unofficial()

    if permit.action_type not in ("publish_post", "publish_comment"):
        _refuse(conn, permit, f"this client does not perform {permit.action_type}")

    if settings.publish_mode == MODE_PREPARE:
        # Not an error — the expected outcome of the default mode.
        with db.transaction(conn):
            db.log(conn, "prepare:handoff", entity="approvals", entity_id=permit.approval_id,
                   approval_id=permit.approval_id,
                   detail=f"{permit.action_type} prepared for manual publishing")
        return {
            "sent": False,
            "mode": MODE_PREPARE,
            "text": permit.payload,
            "target": permit.target,
            "note": "Approved and ready. Copy this and publish it yourself — "
                    "prepare_and_paste is the active mode.",
        }

    ready = readiness()
    if not ready["can_publish_via_api"]:
        _refuse(conn, permit,
                "official API mode is selected but not ready: "
                + "; ".join(ready["outstanding"]))

    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()

    try:
        response = _call_linkedin(token, permit)
    except LinkedInError:
        raise
    except Exception as exc:  # noqa: BLE001 - reported, redacted, never swallowed
        with db.transaction(conn):
            db.log(conn, "external:error", entity="approvals", entity_id=permit.approval_id,
                   approval_id=permit.approval_id, outcome="error", detail=redact(exc))
        raise LinkedInError(redact(f"the action could not be completed: {exc}")) from exc

    with db.transaction(conn):
        db.log(conn, "external:published", entity="approvals", entity_id=permit.approval_id,
               approval_id=permit.approval_id,
               detail=f"{permit.action_type} -> {response.get('id', 'unknown id')}")
    return {"sent": True, "mode": MODE_OFFICIAL_API, "response": response}


def sandbox_check(conn: sqlite3.Connection) -> dict[str, Any]:
    """The rehearsal step in the roadmap: verify the credential without posting.

    Calls LinkedIn's userinfo endpoint, which reads and never writes. It proves
    the developer application, the OAuth token and the connection all work
    before a single real post is attempted.
    """

    _refuse_unofficial()
    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()
    if not token:
        return {"ok": False, "reason": "no OAuth token is configured"}

    import urllib.error
    import urllib.request

    request = urllib.request.Request(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8") or "{}")
        with db.transaction(conn):
            db.log(conn, "sandbox:check", detail="userinfo reachable")
        # Report that identity resolved, not the identity itself.
        return {"ok": True, "identity_resolved": bool(data.get("sub")),
                "note": "Read-only check. Nothing was posted."}
    except urllib.error.HTTPError as exc:
        with db.transaction(conn):
            db.log(conn, "sandbox:check", outcome="error", detail=f"HTTP {exc.code}")
        return {"ok": False, "status": exc.code,
                "reason": ("the token was rejected — re-run the OAuth flow"
                           if exc.code == 401 else
                           "the application does not hold the permission it needs"
                           if exc.code == 403 else "LinkedIn refused the check")}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": redact(exc)}


def _refuse(conn: sqlite3.Connection, permit: Permit, reason: str) -> None:
    with db.transaction(conn):
        db.log(conn, "external:refused", entity="approvals", entity_id=permit.approval_id,
               approval_id=permit.approval_id, outcome="refused", detail=reason)
    raise LinkedInError(redact(reason))


def _call_linkedin(token: str, permit: Permit) -> dict[str, Any]:
    """The single official-API call.

    urllib rather than a dependency: a module that touches FMB's reputation
    should have as little third-party code in its outward path as possible.
    """

    import urllib.error
    import urllib.request

    author = os.environ.get("LINKEDIN_AUTHOR_URN", "").strip()
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
        if exc.code == 403:
            # A declared scope is a claim; this is LinkedIn's answer.
            raise LinkedInError(
                "LinkedIn refused with 403: the developer application does not actually hold "
                f"{REQUIRED_SCOPE} for this member. The permission is not approved yet — "
                "stay in prepare_and_paste until it is."
            ) from exc
        raise LinkedInError(redact(f"LinkedIn returned {exc.code}: {detail}")) from exc
