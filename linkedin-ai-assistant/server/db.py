"""SQLite access for the assistant.

One connection helper, one migration path, and foreign keys on. Everything else
in the module goes through here so there is a single place where the store is
opened and a single place where the schema is applied.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Sequence

from .config import SCHEMA_PATH, settings


class StoreError(RuntimeError):
    """Raised when the local store cannot be opened or migrated."""


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, isolation_level=None)
    conn.row_factory = sqlite3.Row
    # Enforced per connection, not once at creation: SQLite defaults this off.
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def connection(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    """Open the store, applying the schema if it has not been applied yet."""

    target = Path(path) if path else settings.db_path
    try:
        conn = _connect(target)
    except sqlite3.Error as exc:  # pragma: no cover - filesystem dependent
        raise StoreError(f"could not open the assistant store at {target}: {exc}") from exc
    try:
        _migrate(conn)
        yield conn
    finally:
        conn.close()


def _migrate(conn: sqlite3.Connection) -> None:
    if not SCHEMA_PATH.is_file():
        raise StoreError(f"schema is missing at {SCHEMA_PATH}")
    try:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    except sqlite3.Error as exc:
        raise StoreError(f"could not apply the schema: {exc}") from exc


@contextmanager
def transaction(conn: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    """Wrap a unit of work so a half-finished change never lands."""

    conn.execute("BEGIN")
    try:
        yield conn
    except Exception:
        conn.execute("ROLLBACK")
        raise
    conn.execute("COMMIT")


def rows(conn: sqlite3.Connection, sql: str, args: Sequence[Any] = ()) -> list[dict]:
    return [dict(r) for r in conn.execute(sql, tuple(args)).fetchall()]


def one(conn: sqlite3.Connection, sql: str, args: Sequence[Any] = ()) -> dict | None:
    row = conn.execute(sql, tuple(args)).fetchone()
    return dict(row) if row else None


def log(
    conn: sqlite3.Connection,
    action: str,
    *,
    actor: str = "assistant",
    entity: str | None = None,
    entity_id: int | None = None,
    approval_id: int | None = None,
    outcome: str = "ok",
    detail: str | None = None,
) -> None:
    """Append to the audit trail.

    Detail is redacted on the way in rather than on the way out, so a secret
    never reaches the file at all.
    """

    from .config import redact  # local import keeps config side-effect free here

    conn.execute(
        "INSERT INTO activity_logs (actor, action, entity, entity_id, approval_id, outcome, detail)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (actor, action, entity, entity_id, approval_id, outcome,
         redact(detail) if detail is not None else None),
    )
