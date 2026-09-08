"""MCP server exposing the FMB AI Chief of Staff to an assistant.

Speaks MCP over stdio with no third-party dependencies. PCO has no Python
package manifest and one stdlib-only validator script; adding a dependency tree
to a module that handles FMB's positioning and contacts would be a poor trade for
a few hundred lines of protocol glue.

**The tool surface is the safety boundary.** There is no tool here that posts,
comments, messages or connects. The most an assistant can do through this server
is write a row into a local database and ask a human to look at it. Actually
sending anything requires the separate, gated path in ``linkedin_client``, which
needs a claimed approval, an armed environment and a credential — none of which
an assistant can grant itself.

Run it directly:

    python3 linkedin-ai-assistant/server/mcp_server.py

or point an MCP client at that command.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Callable

if __package__ in (None, ""):  # allow running the file directly
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from server import approval_manager, db, knowledge_search, linkedin_client  # type: ignore
    from server.config import redact, settings  # type: ignore
else:
    from . import approval_manager, db, knowledge_search, linkedin_client
    from .config import redact, settings

PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {"name": "fmb-chief-of-staff", "version": "1.0.0"}

Handler = Callable[[dict[str, Any]], Any]
TOOLS: list[dict[str, Any]] = []
_HANDLERS: dict[str, Handler] = {}


def tool(name: str, description: str, schema: dict[str, Any]) -> Callable[[Handler], Handler]:
    def register(fn: Handler) -> Handler:
        TOOLS.append({"name": name, "description": description, "inputSchema": schema})
        _HANDLERS[name] = fn
        return fn
    return register


def _obj(properties: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {"type": "object", "properties": properties, "required": required or []}


_STR = {"type": "string"}
_INT = {"type": "integer"}


# ── Memory ──────────────────────────────────────────────────────────────────

@tool("memory_search",
      "Search FMB's memory files. Every result states whether it is confirmed or "
      "still holds unfilled fields — never present an unconfirmed result as her position.",
      _obj({"query": _STR, "limit": _INT}, ["query"]))
def _memory_search(args: dict[str, Any]) -> Any:
    return knowledge_search.search(str(args["query"]), limit=int(args.get("limit", 5)))


@tool("memory_brief",
      "Everything the assistant should know before writing about a topic, with an "
      "explicit list of what is still unconfirmed.",
      _obj({"topic": _STR, "limit": _INT}, ["topic"]))
def _memory_brief(args: dict[str, Any]) -> Any:
    return knowledge_search.brief(str(args["topic"]), limit=int(args.get("limit", 4)))


@tool("memory_health",
      "How much of FMB's memory is filled in. Run this before trusting the assistant "
      "to speak in her voice.",
      _obj({}))
def _memory_health(_: dict[str, Any]) -> Any:
    return knowledge_search.memory_health()


@tool("projects_list", "FMB's projects as recorded, each with its confidence.", _obj({}))
def _projects_list(_: dict[str, Any]) -> Any:
    with db.connection() as conn:
        return knowledge_search.projects(conn)


# ── Content ─────────────────────────────────────────────────────────────────

CONTENT_SHAPE = _obj({
    "kind": {"type": "string", "enum": ["idea", "post", "carousel", "comment_reply",
                                        "article", "newsletter"]},
    "title": _STR,
    "objective": _STR,
    "audience": _STR,
    "strategic_angle": _STR,
    "body": _STR,
    "visual_notes": _STR,
    "recommended_action": _STR,
    "scheduled_for": _STR,
}, ["objective", "audience", "strategic_angle", "recommended_action"])


@tool("content_save",
      "Record a content idea or draft. Objective, audience, strategic angle and "
      "recommended action are required — a draft without them is decoration.",
      CONTENT_SHAPE)
def _content_save(args: dict[str, Any]) -> Any:
    with db.connection() as conn, db.transaction(conn):
        cur = conn.execute(
            "INSERT INTO content (kind, title, objective, audience, strategic_angle, body,"
            " visual_notes, recommended_action, scheduled_for, status)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')",
            (args.get("kind", "post"), args.get("title"), args["objective"], args["audience"],
             args["strategic_angle"], args.get("body"), args.get("visual_notes"),
             args["recommended_action"], args.get("scheduled_for")),
        )
        content_id = int(cur.lastrowid)
        db.log(conn, "content:save", entity="content", entity_id=content_id,
               detail=args.get("title") or args["objective"])
    return {"content_id": content_id, "status": "draft",
            "next": "Submit it for approval with approval_submit when it is ready for FMB."}


@tool("content_list", "Content by status, most recent first.",
      _obj({"status": _STR, "limit": _INT}))
def _content_list(args: dict[str, Any]) -> Any:
    status = args.get("status")
    with db.connection() as conn:
        if status:
            return db.rows(conn, "SELECT * FROM content WHERE status = ? ORDER BY id DESC LIMIT ?",
                           (status, int(args.get("limit", 50))))
        return db.rows(conn, "SELECT * FROM content ORDER BY id DESC LIMIT ?",
                       (int(args.get("limit", 50)),))


@tool("content_prepare",
      "Format a draft for FMB to post herself, with length and tone checks. "
      "This does not post anything.",
      _obj({"text": _STR, "as_comment": {"type": "boolean"}, "target": _STR}, ["text"]))
def _content_prepare(args: dict[str, Any]) -> Any:
    text = str(args["text"])
    prepared = (linkedin_client.prepare_comment(text, target=args.get("target"))
                if args.get("as_comment") else linkedin_client.prepare_post(text))
    return prepared.as_dict()


# ── Relationships and opportunities ─────────────────────────────────────────

@tool("contact_upsert",
      "Record or update a relationship. Holds no email, phone or address by design.",
      _obj({"full_name": _STR, "headline": _STR, "organisation": _STR, "linkedin_url": _STR,
            "relationship": {"type": "string",
                             "enum": ["cold", "warm", "active", "dormant", "do_not_contact"]},
            "how_we_met": _STR, "notes": _STR, "follow_up_on": _STR}, ["full_name"]))
def _contact_upsert(args: dict[str, Any]) -> Any:
    with db.connection() as conn, db.transaction(conn):
        cur = conn.execute(
            "INSERT INTO contacts (full_name, headline, organisation, linkedin_url,"
            " relationship, how_we_met, notes, follow_up_on)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            " ON CONFLICT(linkedin_url) DO UPDATE SET"
            " full_name=excluded.full_name, headline=excluded.headline,"
            " organisation=excluded.organisation, relationship=excluded.relationship,"
            " notes=COALESCE(excluded.notes, contacts.notes),"
            " follow_up_on=COALESCE(excluded.follow_up_on, contacts.follow_up_on),"
            " updated_at=datetime('now')",
            (args["full_name"], args.get("headline"), args.get("organisation"),
             args.get("linkedin_url"), args.get("relationship", "cold"),
             args.get("how_we_met"), args.get("notes"), args.get("follow_up_on")),
        )
        db.log(conn, "contact:upsert", entity="contacts", entity_id=cur.lastrowid,
               detail=args["full_name"])
    return {"ok": True, "full_name": args["full_name"]}


@tool("follow_ups_due", "Relationships with a follow-up date on or before a given day.",
      _obj({"on_or_before": _STR}))
def _follow_ups(args: dict[str, Any]) -> Any:
    cutoff = args.get("on_or_before") or "now"
    with db.connection() as conn:
        return db.rows(conn,
                       "SELECT id, full_name, organisation, relationship, notes, follow_up_on"
                       " FROM contacts WHERE follow_up_on IS NOT NULL"
                       " AND date(follow_up_on) <= date(?) ORDER BY follow_up_on",
                       (cutoff,))


@tool("opportunity_score",
      "Record an opportunity and score it on relevance, alignment, value and timing "
      "(0-5 each). The rationale is required: a score you cannot explain is a guess.",
      _obj({"title": _STR, "summary": _STR,
            "relevance": _INT, "alignment": _INT, "value": _INT, "timing": _INT,
            "rationale": _STR, "next_step": _STR, "next_step_on": _STR},
           ["title", "relevance", "alignment", "value", "timing", "rationale"]))
def _opportunity_score(args: dict[str, Any]) -> Any:
    scores = {k: int(args[k]) for k in ("relevance", "alignment", "value", "timing")}
    for key, val in scores.items():
        if not 0 <= val <= 5:
            raise ValueError(f"{key} must be between 0 and 5, got {val}")
    with db.connection() as conn, db.transaction(conn):
        cur = conn.execute(
            "INSERT INTO opportunities (title, summary, score_relevance, score_alignment,"
            " score_value, score_timing, score_rationale, next_step, next_step_on)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (args["title"], args.get("summary"), scores["relevance"], scores["alignment"],
             scores["value"], scores["timing"], args["rationale"],
             args.get("next_step"), args.get("next_step_on")),
        )
        opp_id = int(cur.lastrowid)
        db.log(conn, "opportunity:score", entity="opportunities", entity_id=opp_id,
               detail=args["title"])
    # Read the verdict back from the view rather than recomputing it here, so
    # there is exactly one definition of what a score means.
    with db.connection() as conn:
        row = db.one(conn, "SELECT total, reading, veto FROM opportunity_scores WHERE id = ?",
                     (opp_id,)) or {}
    out = {"opportunity_id": opp_id, "total": row.get("total"), "of": 20,
           "breakdown": scores, "reading": row.get("reading")}
    if row.get("veto"):
        out["veto"] = row["veto"]
    return out


@tool("opportunities_list", "Opportunities with their derived totals.", _obj({"stage": _STR}))
def _opportunities_list(args: dict[str, Any]) -> Any:
    with db.connection() as conn:
        if args.get("stage"):
            return db.rows(conn, "SELECT * FROM opportunity_scores WHERE stage = ?"
                                 " ORDER BY total DESC", (args["stage"],))
        return db.rows(conn, "SELECT * FROM opportunity_scores ORDER BY total DESC")


# ── Approvals ───────────────────────────────────────────────────────────────

@tool("approval_submit",
      "Put a proposed external action in front of FMB. This creates a request. "
      "It does not perform the action and cannot.",
      _obj({"action_type": {"type": "string",
                            "enum": list(approval_manager.VALID_ACTIONS)},
            "subject": _STR, "payload": _STR, "target": _STR,
            "risk": {"type": "string", "enum": list(approval_manager.VALID_RISKS)},
            "risk_notes": _STR},
           ["action_type", "subject", "payload"]))
def _approval_submit(args: dict[str, Any]) -> Any:
    with db.connection() as conn:
        approval_id = approval_manager.draft(
            conn,
            action_type=args["action_type"], subject=args["subject"],
            payload=args["payload"], target=args.get("target"),
            risk=args.get("risk", "medium"), risk_notes=args.get("risk_notes"),
        )
        approval_manager.submit(conn, approval_id)
    return {"approval_id": approval_id, "status": "pending_review",
            "next": "FMB decides in the approval centre. Nothing happens until she does."}


@tool("approval_queue", "What is waiting for FMB's decision.", _obj({"status": _STR}))
def _approval_queue(args: dict[str, Any]) -> Any:
    with db.connection() as conn:
        return approval_manager.queue(conn, args.get("status", "pending_review"))


@tool("activity_log", "The audit trail, newest first.", _obj({"limit": _INT}))
def _activity_log(args: dict[str, Any]) -> Any:
    with db.connection() as conn:
        return approval_manager.audit(conn, int(args.get("limit", 50)))


@tool("capability_report",
      "What this system can and cannot do right now, including whether anything is "
      "able to reach LinkedIn.",
      _obj({}))
def _capability(_: dict[str, Any]) -> Any:
    return {
        "linkedin": linkedin_client.capability(),
        "operator": settings.operator,
        "database": str(settings.db_path),
        "guarantee": ("No tool on this server can publish, comment, message or connect. "
                      "Those need a human approval claimed through a separate, gated path."),
    }


# ── Protocol ────────────────────────────────────────────────────────────────

def _dispatch(method: str, params: dict[str, Any]) -> Any:
    if method == "initialize":
        return {"protocolVersion": PROTOCOL_VERSION, "serverInfo": SERVER_INFO,
                "capabilities": {"tools": {}}}
    if method in ("notifications/initialized", "initialized"):
        return None
    if method == "tools/list":
        return {"tools": TOOLS}
    if method == "tools/call":
        name = params.get("name", "")
        handler = _HANDLERS.get(name)
        if handler is None:
            raise KeyError(f"unknown tool: {name}")
        result = handler(params.get("arguments") or {})
        return {"content": [{"type": "text",
                             "text": json.dumps(result, indent=2, default=str)}]}
    if method == "ping":
        return {}
    raise KeyError(f"unknown method: {method}")


def serve(stdin=sys.stdin, stdout=sys.stdout) -> None:
    """Read newline-delimited JSON-RPC from stdin until it closes."""

    for line in stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            _write(stdout, {"jsonrpc": "2.0", "id": None,
                            "error": {"code": -32700, "message": "invalid JSON"}})
            continue

        request_id = message.get("id")
        try:
            result = _dispatch(message.get("method", ""), message.get("params") or {})
        except KeyError as exc:
            _write(stdout, {"jsonrpc": "2.0", "id": request_id,
                            "error": {"code": -32601, "message": redact(exc)}})
            continue
        except Exception as exc:  # noqa: BLE001 - reported to the client, redacted
            _write(stdout, {"jsonrpc": "2.0", "id": request_id,
                            "error": {"code": -32000, "message": redact(exc)}})
            continue

        if request_id is None:
            continue  # a notification wants no reply
        _write(stdout, {"jsonrpc": "2.0", "id": request_id, "result": result})


def _write(stream, payload: dict[str, Any]) -> None:
    stream.write(json.dumps(payload, default=str) + "\n")
    stream.flush()


if __name__ == "__main__":
    serve()
