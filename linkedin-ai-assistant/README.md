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
| Draft posts, replies and carousels | Publish any of them without an approval |
| Score an opportunity and write the opening line | Send a message or a connection request |
| Track relationships and remind FMB of follow-ups | Contact anyone on its own initiative |
| Report on what was measured | Estimate a number and present it as data |
| Say a draft is weak and why | Agree to be agreeable |
| Publish through LinkedIn's official API, once approved | Touch a session cookie, ever |

Publishing is not permanently off — it is **gated**. See the roadmap below for
the path from prepare-and-paste to official API publishing. What is permanently
off is unofficial automation of a logged-in account.

**Where that is enforced** — not in a prompt, which can be talked around:

- The schema will not let `approvals` reach `approved` without a named decider
  and a timestamp, will not let `content` reach `published` without an approval
  id, and has a trigger that refuses to log a completed external action with no
  approval behind it.
- `approval_manager.claim()` is the only way to obtain permission to act. It
  works once per approval, refuses anything not approved, and expires an
  approval older than 72 hours.
- `linkedin_client` runs in `prepare_and_paste` unless every one of seven gates
  is open, **and** a valid permit is presented. The default mode hands text back;
  it does not send.
- The MCP server exposes no tool that can publish, comment, message or connect.
  There is a test that fails if one ever appears.

---

## The memory says what it knows, and marks what it does not

FMB's approved context is in place: her positioning, professional areas, brand
principle, and the canonical descriptions of SENZ, Masinloc Connect, Cognita
Institute, FMB News and the book — including the hard rules that go with them
(Masinloc Connect is not an LGU portal; Cognita is not degree-granting; no
invented SENZ clients).

Fifteen fields remain marked `[TO CONFIRM: ...]` because nobody has answered
them yet. Nothing is filled in by inference: a plausible guess would mean the
assistant later repeats an invention as FMB's own positioning, in public, in her
voice. An empty field is recoverable; a confident fabrication in her mouth is not.

Retrieval returns unconfirmed sections flagged with an explicit caution, and
`memory_health` reports the count — which the dashboard shows on every page.

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
python3 tests/test_assistant.py     # 38 checks, no dependencies

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
tests/        38 checks, grouped by the promise each one protects
```

## OFFICIAL LINKEDIN INTEGRATION ROADMAP

Two modes, and only two. There is no unofficial step between them, and none will
be added: cookies, `li_at`, session tokens and headless automation of a logged-in
account risk the very account this system exists to protect. `_refuse_unofficial()`
raises if such a credential is even present in the environment, and a test scans
the source so a future edit cannot quietly add one.

```
  MODE 1 ── prepare_and_paste ─────────────────────────── the default, always available
     │       assistant drafts → checks length, feed truncation, hashtags, links
     │       → approval → FMB copies and publishes herself
     │
     ├── 1. Approved developer application       LINKEDIN_CLIENT_ID
     ├── 2. OAuth configured                     LINKEDIN_ACCESS_TOKEN via the official flow
     ├── 3. Permission validated                 LINKEDIN_SCOPES declares w_member_social,
     │                                           and LinkedIn's own 403 is treated as the
     │                                           real answer, not the declaration
     ├── 4. Sandbox / test action                sandbox_check() — reads userinfo, posts nothing
     ├── 5. FMB explicitly enables               FMB_PUBLISH_MODE=official_linkedin_api
     │                                           FMB_ALLOW_EXTERNAL=1, FMB_EXECUTE_FOR_REAL=1
     ├── 6. FMB approval, per action             a claimed permit for that exact text
     ▼
  MODE 2 ── official_linkedin_api ────────────── controlled live publishing
```

**Step 1 — approved developer application.** Create the app in LinkedIn's
developer portal and request the Community Management API. Approval is
LinkedIn's decision and can take weeks. Until it lands, MODE 1 is not a
workaround — it is the system working as designed.

**Step 2 — OAuth.** Authorise the app against FMB's account through the official
flow. The resulting token goes in the environment. It is never committed, never
written to the database, and never appears in a log line — `redact()` scrubs it
from anything this module writes.

**Step 3 — permission validation.** `LINKEDIN_SCOPES` declares what the app was
granted, and `readiness()` checks it. A declaration is a claim, so the live path
also treats a `403` from LinkedIn as authoritative: the permission is not
actually held, and the error says to stay in MODE 1 until it is.

**Step 4 — sandbox / test action.** `sandbox_check()` calls the read-only
userinfo endpoint. It proves the app, the token and the connection work without
posting anything. Run it before arming execution.

**Step 5 — FMB enables it.** Three environment variables, set deliberately by
her. Any one missing and `readiness()` lists it as outstanding and MODE 2 stays
shut.

**Step 6 — approval, every time.** Even with all of the above green, a publish
needs a permit from `approval_manager.claim()`: a named human approved that exact
text, within 72 hours, and the approval has not already been spent. This does not
relax as trust builds.

Check the live state at any point — presence, never values:

```bash
python3 -c "import sys; sys.path.insert(0,'linkedin-ai-assistant'); \
from server import linkedin_client as l; import json; print(json.dumps(l.readiness(), indent=2))"
```

## About LinkedIn posting today

Posting to a personal profile through software requires LinkedIn's Community
Management API and an approved developer application. That approval is real and
obtainable — it is step 1 of the roadmap above, not a closed door.

Until it exists, MODE 1 is the active mode: the assistant produces the exact
text, checked for length, feed truncation, hashtag stuffing and insecure links,
and FMB posts it herself. She picks the moment and reads the room, which software
does badly — so MODE 1 remains the default even after MODE 2 becomes available,
and switching is a deliberate act, not a drift.
