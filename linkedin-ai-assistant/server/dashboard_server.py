"""Loopback-only dashboard for FMB.

A fifth server file beyond the four in the brief, because the dashboard needs
something to read from and putting an HTTP server inside `mcp_server.py` would
have mixed two protocols in one module for no benefit.

Three properties matter more than features:

* **Loopback only.** Binds 127.0.0.1. Never 0.0.0.0. A dashboard holding FMB's
  contacts and unpublished drafts must not be reachable from the network she
  happens to be on.
* **Reads are open, writes are decisions.** The only mutating endpoint is the
  approve/reject one, which is the point of the approval centre. Everything else
  is read-only.
* **Nothing is served from outside the module.** Path traversal is refused
  explicitly rather than trusted to the filesystem.

    python3 linkedin-ai-assistant/server/dashboard_server.py
    # then open http://127.0.0.1:8765/
"""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from server import approval_manager, db, knowledge_search, linkedin_client  # type: ignore
    from server.config import MODULE_ROOT, redact, settings  # type: ignore
else:
    from . import approval_manager, db, knowledge_search, linkedin_client
    from .config import MODULE_ROOT, redact, settings

DASHBOARD_DIR = MODULE_ROOT / "dashboard"
CONTENT_TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
                 ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml"}


def _payload(path: str, query: dict[str, list[str]]) -> object:
    with db.connection() as conn:
        if path == "/api/approvals":
            # Defaults to what is waiting for a decision, matching
            # approval_manager.queue(). ?status=all returns the full history.
            status = (query.get("status") or ["pending_review"])[0]
            return approval_manager.queue(conn, None if status == "all" else status)
        if path == "/api/content":
            return db.rows(conn, "SELECT * FROM content ORDER BY"
                                 " COALESCE(scheduled_for, '9999') ASC, id DESC")
        if path == "/api/contacts":
            return db.rows(conn, "SELECT * FROM contacts ORDER BY"
                                 " COALESCE(follow_up_on, '9999'), full_name")
        if path == "/api/opportunities":
            return db.rows(conn, "SELECT * FROM opportunity_scores ORDER BY total DESC")
        if path == "/api/analytics":
            return db.rows(conn,
                           "SELECT a.*, c.title, c.kind FROM analytics a"
                           " LEFT JOIN content c ON c.id = a.content_id"
                           " ORDER BY a.measured_on DESC")
        if path == "/api/activity":
            return approval_manager.audit(conn, 200)
        if path == "/api/health":
            _li = linkedin_client
            return {"memory": knowledge_search.memory_health(),
                    "operator": settings.operator,
                    "publish_mode": settings.publish_mode,
                    "linkedin": _li.readiness(),
                    "external_actions_allowed": settings.allow_external,
                    "dry_run": settings.dry_run}
    raise KeyError(path)


class Handler(BaseHTTPRequestHandler):
    server_version = "FMBDashboard/1.0"

    def log_message(self, fmt: str, *args) -> None:  # keep the console quiet
        pass

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        # This data never belongs in a shared cache, and the page never belongs
        # in a frame on somebody else's site.
        self.send_header("Cache-Control", "no-store, private")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, obj: object) -> None:
        self._send(status, json.dumps(obj, default=str, indent=2).encode("utf-8"),
                   "application/json; charset=utf-8")

    #: Binding to 127.0.0.1 keeps other machines out. It does not keep out the
    #: browser FMB is already using: any page she visits can send a request to
    #: her own loopback port, and the browser attaches no warning to it. Three
    #: checks, each closing a different route in, and each failing closed.
    LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "[::1]", "::1"}

    def _local_host(self) -> bool:
        """The request must be addressed to loopback by name, not just arrive there.

        A DNS rebinding attack points attacker.com at 127.0.0.1 and the browser
        then treats this dashboard as same-origin — reads included. The give-away
        is the Host header, which still says attacker.com.
        """
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip().lower()
        return host in self.LOOPBACK_HOSTS

    def _same_site(self) -> bool:
        """A cross-site Origin is refused outright.

        A page on the open web can POST here; what it cannot do is lie about
        Origin. Absent is allowed because a same-origin form or a curl from FMB's
        own terminal sends none.
        """
        origin = self.headers.get("Origin")
        if not origin:
            return True
        host = urlparse(origin).hostname
        return (host or "").lower() in {"127.0.0.1", "localhost", "::1"}

    def _refuse(self, why: str) -> None:
        self._json(403, {"error": why})

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler contract
        if not self._local_host():
            self._refuse("this dashboard answers only to localhost")
            return
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/"):
            try:
                self._json(200, _payload(path, parse_qs(parsed.query)))
            except KeyError:
                self._json(404, {"error": "no such endpoint"})
            except Exception as exc:  # noqa: BLE001
                self._json(500, {"error": redact(exc)})
            return
        self._serve_file(path)

    def do_POST(self) -> None:  # noqa: N802
        # The only route in this module that changes an approval, and therefore
        # the only one worth forging. It was reachable from any website: an HTML
        # form with enctype="text/plain" can shape a valid JSON body, and nothing
        # here looked at where the request came from. A page FMB happened to open
        # could mark a pending action approved, under her name, in the audit log.
        if not self._local_host():
            self._refuse("this dashboard answers only to localhost")
            return
        if not self._same_site():
            self._refuse("a decision cannot be submitted from another site")
            return
        # A form can only send text/plain, urlencoded or multipart. Requiring
        # JSON means a cross-origin caller must use fetch(), which the browser
        # preflights — and nothing here answers a preflight.
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            self._refuse("a decision must be sent as application/json")
            return
        parsed = urlparse(self.path)
        if parsed.path != "/api/decide":
            self._json(404, {"error": "no such endpoint"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            approval_id = int(body["approval_id"])
            decision = str(body["decision"]).lower()
            notes = body.get("notes")
            with db.connection() as conn:
                if decision == "approve":
                    row = approval_manager.approve(conn, approval_id,
                                                   by=settings.operator, notes=notes)
                elif decision == "reject":
                    row = approval_manager.reject(conn, approval_id,
                                                  by=settings.operator, notes=notes)
                else:
                    raise ValueError("decision must be 'approve' or 'reject'")
            self._json(200, row)
        except approval_manager.ApprovalError as exc:
            self._json(409, {"error": redact(exc)})
        except Exception as exc:  # noqa: BLE001
            self._json(400, {"error": redact(exc)})

    def _serve_file(self, path: str) -> None:
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        target = (DASHBOARD_DIR / rel).resolve()
        # Refuse anything that resolves outside the dashboard folder, rather
        # than relying on the OS to have no interesting files above it.
        if not str(target).startswith(str(DASHBOARD_DIR.resolve())) or not target.is_file():
            self._send(404, b"Not found", "text/plain; charset=utf-8")
            return
        self._send(200, target.read_bytes(),
                   CONTENT_TYPES.get(target.suffix, "application/octet-stream"))


def serve(port: int | None = None) -> None:
    bind_port = int(port or settings.dashboard_port)
    httpd = ThreadingHTTPServer(("127.0.0.1", bind_port), Handler)
    print(f"FMB Chief of Staff — dashboard on http://127.0.0.1:{bind_port}/")
    print(f"store: {settings.db_path}")
    print(f"external actions: {'ALLOWED' if settings.allow_external else 'blocked'}"
          f" · execution: {'ARMED' if not settings.dry_run else 'dry run'}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    serve()
