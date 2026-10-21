"""Retrieval over FMB's memory files and project records.

Deliberately not a vector database. The corpus is a couple of dozen markdown
sections; a scoring function you can read in one sitting beats an embedding
index you cannot debug, and it has no model, no network call and no drift.

The part that matters more than the ranking: every result carries its
**confidence**. A section still holding `[TO CONFIRM]` placeholders is returned
marked `unconfirmed`, so an agent quoting it has to say so rather than passing
FMB's draft notes off as her settled positioning. Retrieval that cannot tell you
how sure it is will eventually put an invention in her voice.
"""

from __future__ import annotations

import re
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

from . import db
from .config import AGENTS_DIR, MEMORY_DIR, WORKFLOWS_DIR

#: The marker an unfilled memory field carries.
PLACEHOLDER = re.compile(r"\[TO CONFIRM[^\]]*\]", re.IGNORECASE)

#: Every memory file opens with an HTML comment explaining the markers, and that
#: legend contains the marker itself. Counting it made a fully-answered file
#: still report as needing FMB, which would have trained her to ignore the very
#: signal the count exists to give.
_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)


def _prose(text: str) -> str:
    """The file with its explanatory comments removed."""
    return _COMMENT.sub("", text)

_WORD = re.compile(r"[a-z0-9']+")
_STOP = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how",
    "in", "is", "it", "its", "of", "on", "or", "that", "the", "this", "to", "was",
    "what", "when", "where", "which", "who", "why", "with", "you", "your",
}


def _tokens(text: str) -> list[str]:
    return [w for w in _WORD.findall(text.lower()) if w not in _STOP and len(w) > 1]


@dataclass
class Passage:
    """One retrievable section of memory."""

    source: str          # file name
    heading: str
    body: str
    confidence: str      # 'confirmed' | 'unconfirmed'
    placeholders: list[str] = field(default_factory=list)
    score: float = 0.0

    def as_dict(self) -> dict[str, Any]:
        out = {
            "source": self.source,
            "heading": self.heading,
            "body": self.body,
            "confidence": self.confidence,
            "score": round(self.score, 3),
        }
        if self.confidence == "unconfirmed":
            out["caution"] = (
                "This section still has unfilled fields. Do not present it as FMB's "
                "settled position — say what is missing and ask her."
            )
            out["unfilled"] = self.placeholders
        return out


def _split_sections(path: Path) -> Iterable[Passage]:
    """Split a memory file on its markdown headings."""

    try:
        text = _prose(path.read_text(encoding="utf-8"))
    except OSError:
        return []

    parts = re.split(r"^(#{1,3})\s+(.+)$", text, flags=re.MULTILINE)
    # re.split with two groups yields: [pre, hashes, heading, body, hashes, ...]
    passages: list[Passage] = []
    if parts and parts[0].strip():
        passages.append(_passage(path.name, "(preamble)", parts[0]))
    for i in range(1, len(parts) - 2, 3):
        heading, body = parts[i + 1].strip(), parts[i + 2]
        if body.strip():
            passages.append(_passage(path.name, heading, body))
    return passages


def _passage(source: str, heading: str, body: str) -> Passage:
    found = PLACEHOLDER.findall(body)
    return Passage(
        source=source,
        heading=heading,
        body=body.strip(),
        confidence="unconfirmed" if found else "confirmed",
        placeholders=sorted(set(found)),
    )


def corpus() -> list[Passage]:
    """Every memory, agent and workflow section on disk."""

    out: list[Passage] = []
    for folder in (MEMORY_DIR, AGENTS_DIR, WORKFLOWS_DIR):
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob("*.md")):
            out.extend(_split_sections(path))
    return out


def search(query: str, *, limit: int = 5, include_unconfirmed: bool = True) -> list[dict]:
    """Rank memory sections against a query.

    Scoring is term overlap with a small bonus for a heading match, normalised
    by section length so a long section does not win on volume alone.
    """

    terms = _tokens(query)
    if not terms:
        return []

    results: list[Passage] = []
    for passage in corpus():
        if not include_unconfirmed and passage.confidence == "unconfirmed":
            continue
        body_tokens = _tokens(passage.body)
        if not body_tokens:
            continue
        head_tokens = set(_tokens(passage.heading))
        hits = sum(body_tokens.count(t) for t in terms)
        if not hits and not (head_tokens & set(terms)):
            continue
        passage.score = (hits / (len(body_tokens) ** 0.5)) + 1.5 * len(head_tokens & set(terms))
        results.append(passage)

    results.sort(key=lambda p: p.score, reverse=True)
    return [p.as_dict() for p in results[: max(1, int(limit))]]


def brief(topic: str, *, limit: int = 4) -> dict[str, Any]:
    """What the assistant should know before writing about ``topic``.

    Returns the passages plus an explicit statement of what is still unconfirmed,
    so a caller has to actively ignore the gap rather than never see it.
    """

    passages = search(topic, limit=limit)
    unconfirmed = [p for p in passages if p["confidence"] == "unconfirmed"]
    return {
        "topic": topic,
        "passages": passages,
        "confirmed_count": len(passages) - len(unconfirmed),
        "unconfirmed_count": len(unconfirmed),
        "instruction": (
            "Write only from the confirmed passages. Where an unconfirmed one is "
            "relevant, ask FMB to fill the gap instead of inventing an answer."
        ),
    }


def memory_health() -> dict[str, Any]:
    """How much of the memory is actually filled in.

    Useful on its own, and the honest answer to 'does the assistant know FMB
    yet?'. A file full of placeholders is a file the assistant must not speak from.
    """

    files: list[dict[str, Any]] = []
    total, unfilled = 0, 0
    for folder, label in ((MEMORY_DIR, "memory"), (AGENTS_DIR, "agents"),
                          (WORKFLOWS_DIR, "workflows")):
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob("*.md")):
            text = _prose(path.read_text(encoding="utf-8"))
            found = PLACEHOLDER.findall(text)
            sections = len(_split_sections(path))
            total += sections
            unfilled += len(found)
            files.append({
                "group": label,
                "file": path.name,
                "sections": sections,
                "unfilled_fields": len(found),
                "status": "needs FMB" if found else "ready",
            })
    return {
        "files": files,
        "sections_total": total,
        "unfilled_fields_total": unfilled,
        "verdict": ("ready" if unfilled == 0 else
                    f"{unfilled} fields still need FMB before the assistant can speak with authority"),
    }


def projects(conn: sqlite3.Connection) -> list[dict]:
    """Project records, with their confidence attached."""

    return db.rows(conn,
                   "SELECT slug, name, category, one_liner, detail, public_url, status, confidence"
                   " FROM projects WHERE status <> 'archived' ORDER BY name")
