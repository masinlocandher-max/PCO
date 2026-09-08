"""Configuration for the FMB AI Chief of Staff.

Everything here comes from the environment or from safe defaults. Nothing that
could identify or authenticate FMB is written to disk by this module, and there
is no code path that persists a secret.

The one rule worth stating twice: reading a credential into memory to make a
request is fine; writing one anywhere — the database, a log line, an error
message — is not. `redact()` exists so that stays true even when something goes
wrong at three in the morning.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path

MODULE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = MODULE_ROOT.parent

MEMORY_DIR = MODULE_ROOT / "memory"
AGENTS_DIR = MODULE_ROOT / "agents"
WORKFLOWS_DIR = MODULE_ROOT / "workflows"
SCHEMA_PATH = MODULE_ROOT / "database" / "schema.sql"

#: Default store location. Kept out of git by the module .gitignore.
DEFAULT_DB_PATH = MODULE_ROOT / "database" / "fmb_assistant.db"

#: Substrings that mark an environment variable as sensitive. Used by redact()
#: and by the self-check, never to look anything up.
SECRET_HINTS = ("token", "secret", "password", "passwd", "apikey", "api_key",
                "client_secret", "cookie", "session", "credential", "private_key")


def _flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Resolved runtime settings.

    Attributes:
        db_path: Where the local SQLite store lives.
        operator: The human accountable for approvals, recorded on every
            decision. Defaults to the OS user so an approval is never anonymous.
        allow_external: Master switch for anything that leaves the machine.
            Off unless explicitly turned on, so the safe state is the default
            state rather than something you have to remember to choose.
        dry_run: When on (the default), the LinkedIn client describes what it
            would do and does nothing.
        dashboard_port: Loopback port for the local dashboard.
    """

    db_path: Path
    operator: str
    allow_external: bool
    dry_run: bool
    dashboard_port: int

    @classmethod
    def from_env(cls) -> "Settings":
        raw_db = os.environ.get("FMB_ASSISTANT_DB", "").strip()
        try:
            port = int(os.environ.get("FMB_DASHBOARD_PORT", "8765"))
        except ValueError:
            port = 8765
        return cls(
            db_path=Path(raw_db).expanduser() if raw_db else DEFAULT_DB_PATH,
            operator=(os.environ.get("FMB_OPERATOR", "").strip()
                      or os.environ.get("USER", "").strip()
                      or "unknown"),
            allow_external=_flag("FMB_ALLOW_EXTERNAL", False),
            dry_run=not _flag("FMB_EXECUTE_FOR_REAL", False),
            dashboard_port=port,
        )


_TOKENISH = re.compile(
    r"""(?xi)
    (?:bearer\s+[A-Za-z0-9._\-]{12,})        # Authorization headers
    | (?:\b[A-Za-z0-9_\-]{2,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b)  # JWTs
    | (?:\b(?:AQ|AK|sk|pk|ghp|gho|xox)[A-Za-z0-9_\-]{16,}\b)              # common key shapes
    """
)


def redact(text: object) -> str:
    """Return ``text`` with anything credential-shaped replaced.

    Every log line and every error surfaced by this module goes through here.
    It is deliberately eager: a false positive costs a slightly less readable
    log line, a false negative writes a live token into a file.
    """

    out = str(text)
    for name, value in os.environ.items():
        if not value or len(value) < 8:
            continue
        if any(hint in name.lower() for hint in SECRET_HINTS):
            out = out.replace(value, f"[redacted:{name}]")
    return _TOKENISH.sub("[redacted]", out)


def secret_env_names() -> list[str]:
    """Names — never values — of environment variables that look sensitive."""
    return sorted(n for n in os.environ if any(h in n.lower() for h in SECRET_HINTS))


settings = Settings.from_env()
