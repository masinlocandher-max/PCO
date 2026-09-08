# FMB AI Chief of Staff

A private strategic assistant for Francine Marie Bautista. It thinks, drafts,
scores and remembers. It does not publish, reply, message or connect — and it
cannot, which is the point.

**Not a product. Not a service. Not on the internet.** It runs on FMB's machine,
against a local database, behind a loopback dashboard.

---

## Why this folder is not on the website

PCO deploys to GitHub Pages, and the deploy copies **everything** in the
repository root to the public site except `.git`, `.github` and `_site`. Left
alone, this module would have been served at
`francinemariebautista.com/linkedin-ai-assistant/` — her positioning, her
contacts, her opportunity notes and her unpublished drafts, to anyone who
guessed the URL.

Three layers stop that, and the third exists because the first two are only as
good as the next person who edits the workflow:

1. `--exclude 'linkedin-ai-assistant'` in the deploy's staging step.
2. `test ! -d _site/linkedin-ai-assistant` immediately after staging, so a
   dropped exclusion **fails the deploy** instead of publishing.
3. A check in `scripts/validate-site-assets.py` that both of the above are still
   present, so CI fails earlier and says why.

There is a test for each (`tests/test_assistant.py::PrivacyIsStructural`),
including one that deletes the exclusion, confirms the validator refuses, and
puts it back.

The local database and `.env` are git-ignored. Git history is retrievable, so
the rule is that they never arrive — not that they get removed later.

---

## What it will not do

| It will | It will not |
| --- | --- |
| Draft posts, replies and carousels | Publish any of them |
| Score an opportunity and write the opening line | Send a message or a connection request |
| Track relationships and remind FMB of follow-ups | Contact anyone |
| Report on what was measured | Estimate a number and present it as data |
| Say a draft is weak and why | Agree to be agreeable |

This is not a phase before fuller automation. For a personal brand where
reputation is the whole asset, a human pressing publish is the correct design.

**Where that is enforced** — not in a prompt, which can be talked around:

- The schema will not let `approvals` reach `approved` without a named decider
  and a timestamp, will not let `content` reach `published` without an approval
  id, and has a trigger that refuses to log a completed external action with no
  approval behind it.
- `approval_manager.claim()` is the only way to obtain permission to act. It
  works once per approval, refuses anything not approved, and expires an
  approval older than 72 hours.
- `linkedin_client` refuses unless external actions are allowed, execution is
  armed, a credential exists, **and** a valid permit is presented. Dry run is the
  default, so a forgotten setting fails safe.
- The MCP server exposes no tool that can publish, comment, message or connect.
  There is a test that fails if one ever appears.

---

## The memory is deliberately incomplete

`memory/FMB_PROJECT_CONTEXT.md` says almost nothing about SENZ Strategic
Communications, Masinloc Connect or Cognita Institute. That is not an oversight.

This module was built without access to any of them. Writing a plausible mission
statement would mean the assistant later repeats an invention as FMB's own
positioning, in public, in her voice. An empty field is recoverable; a confident
fabrication in her mouth is not.

So every unknown is marked `[TO CONFIRM: ...]`, retrieval returns those sections
flagged `unconfirmed` with an explicit caution, and `memory_health` reports how
many are still open. Fill them in and every agent gets sharper the same day.

Check the state at any time:

```bash
python3 -c "import sys; sys.path.insert(0,'linkedin-ai-assistant'); \
from server import knowledge_search as k; print(k.memory_health()['verdict'])"
```

---

## Getting started

```bash
cd linkedin-ai-assistant
cp .env.example .env          # then set FMB_OPERATOR; leave the switches off
python3 tests/test_assistant.py     # 28 checks, no dependencies

python3 server/dashboard_server.py  # http://127.0.0.1:8765/
```

Point an MCP client at the server with:

```json
{
  "mcpServers": {
    "fmb-chief-of-staff": {
      "command": "python3",
      "args": ["/absolute/path/to/PCO/linkedin-ai-assistant/server/mcp_server.py"],
      "env": { "FMB_OPERATOR": "Francine Marie Bautista" }
    }
  }
}
```

Python 3.9+. No third-party packages, by choice: a module that touches FMB's
reputation should have as little code in it that nobody in this room has read.

---

## Layout

```
memory/       what the assistant knows, and what it openly does not
agents/       five briefs: content, research, engagement, opportunity, reputation
server/       config · db · knowledge_search · approval_manager · linkedin_client
              · mcp_server (the assistant's tool surface)
              · dashboard_server (loopback only)
database/     schema.sql — the approval gate lives here, not only in code
workflows/    approval · publishing · reporting
dashboard/    approval centre · content calendar · relationships · analytics
tests/        28 checks, grouped by the promise each one protects
```

## About LinkedIn posting

LinkedIn does not give individuals posting access. Writing to a personal profile
needs the Community Management API and an approved developer application. Until
FMB has that, **no software can post as her** — and anything claiming otherwise
is either driving her account with a stolen session cookie, against LinkedIn's
terms and risking the account this system exists to protect, or it is lying.

The normal path here is prepare-and-paste: the assistant produces the exact text,
checked for length, feed truncation, hashtag stuffing and insecure links, and FMB
posts it herself. She picks the moment and reads the room — two things software
does badly.

The API path exists, is fully gated, and changes nothing above it if she is ever
granted access.
