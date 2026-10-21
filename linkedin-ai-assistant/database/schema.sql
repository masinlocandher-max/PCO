-- FMB AI Chief of Staff — private local store.
--
-- This database is local to FMB's machine. It is never committed (see the
-- module .gitignore) and never published (see the deploy exclusion in
-- .github/workflows/deploy-pages.yml, which is itself guarded by
-- scripts/validate-site-assets.py).
--
-- Two rules are enforced here in the schema rather than left to application
-- code, because application code changes and a CHECK constraint does not:
--
--   1. Nothing outward-facing exists without an approval row. Every content
--      item and every logged external action carries an approval_id, and an
--      approval only reaches 'approved' with a human decider recorded.
--   2. No credential column exists anywhere. There is nowhere in this schema to
--      put a token, a password or a cookie, which is the most reliable way to
--      make sure none is stored.

PRAGMA foreign_keys = ON;

-- ── Who this is for ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                INTEGER PRIMARY KEY,
  slug              TEXT    NOT NULL UNIQUE,
  display_name      TEXT    NOT NULL,
  headline          TEXT,
  positioning       TEXT,
  voice_notes       TEXT,
  linkedin_url      TEXT,
  -- Confidence in what this row says. 'verified' means FMB confirmed it;
  -- 'draft' means the assistant inferred it and must say so when it is used.
  confidence        TEXT    NOT NULL DEFAULT 'draft'
                            CHECK (confidence IN ('verified', 'draft')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── The work the assistant speaks about ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                INTEGER PRIMARY KEY,
  slug              TEXT    NOT NULL UNIQUE,
  name              TEXT    NOT NULL,
  category          TEXT,           -- venture | publication | institute | community | book
  one_liner         TEXT,
  detail            TEXT,
  public_url        TEXT,
  status            TEXT    NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'paused', 'archived', 'confidential')),
  confidence        TEXT    NOT NULL DEFAULT 'draft'
                            CHECK (confidence IN ('verified', 'draft')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Approvals: the gate every outward action passes through ─────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id                INTEGER PRIMARY KEY,
  action_type       TEXT    NOT NULL
                            CHECK (action_type IN ('publish_post', 'publish_comment',
                                                   'send_message', 'send_connection',
                                                   'external_share', 'other')),
  subject           TEXT    NOT NULL,   -- what this is about, in one line
  payload           TEXT    NOT NULL,   -- the exact text that would go out
  target            TEXT,               -- where it would go, if anywhere
  risk              TEXT    NOT NULL DEFAULT 'medium'
                            CHECK (risk IN ('low', 'medium', 'high')),
  risk_notes        TEXT,
  status            TEXT    NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'pending_review', 'approved',
                                              'rejected', 'executed', 'expired')),
  decided_by        TEXT,               -- the human who approved or rejected
  decided_at        TEXT,
  decision_notes    TEXT,
  -- An approval is only usable once. execute() stamps this, and a second
  -- attempt against the same row is refused.
  executed_at       TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Approved means a person decided. There is no path to 'approved' without a
  -- name and a timestamp on the decision.
  CHECK (status <> 'approved' OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)),
  CHECK (status <> 'rejected' OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)),
  CHECK (status <> 'executed' OR executed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals (status, created_at DESC);

-- ── Content ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content (
  id                INTEGER PRIMARY KEY,
  kind              TEXT    NOT NULL DEFAULT 'post'
                            CHECK (kind IN ('idea', 'post', 'carousel', 'comment_reply',
                                            'article', 'newsletter')),
  title             TEXT,
  objective         TEXT    NOT NULL,   -- every output states what it is for
  audience          TEXT    NOT NULL,
  strategic_angle   TEXT    NOT NULL,
  body              TEXT,               -- the draft itself
  visual_notes      TEXT,
  recommended_action TEXT   NOT NULL,
  project_id        INTEGER REFERENCES projects (id) ON DELETE SET NULL,
  scheduled_for     TEXT,               -- the calendar slot FMB intends, not an auto-post time
  status            TEXT    NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('idea', 'draft', 'awaiting_approval',
                                              'approved', 'published', 'archived')),
  -- Published content must name the approval that let it out.
  approval_id       INTEGER REFERENCES approvals (id) ON DELETE RESTRICT,
  published_url     TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (status <> 'published' OR approval_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_content_status ON content (status, scheduled_for);

-- ── People ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id                INTEGER PRIMARY KEY,
  full_name         TEXT    NOT NULL,
  headline          TEXT,
  organisation      TEXT,
  linkedin_url      TEXT UNIQUE,
  -- Deliberately no email, phone or address column. This is a relationship
  -- memory, not a contact database, and the less of a person it holds the less
  -- there is to lose.
  relationship      TEXT    NOT NULL DEFAULT 'cold'
                            CHECK (relationship IN ('cold', 'warm', 'active', 'dormant', 'do_not_contact')),
  how_we_met        TEXT,
  notes             TEXT,
  last_touch_at     TEXT,
  follow_up_on      TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_followup ON contacts (follow_up_on)
  WHERE follow_up_on IS NOT NULL;

-- ── Opportunities ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id                INTEGER PRIMARY KEY,
  title             TEXT    NOT NULL,
  contact_id        INTEGER REFERENCES contacts (id) ON DELETE SET NULL,
  project_id        INTEGER REFERENCES projects (id) ON DELETE SET NULL,
  summary           TEXT,
  -- The four questions, each 0-5, kept as separate columns so a score can
  -- always be explained rather than just quoted.
  score_relevance   INTEGER NOT NULL DEFAULT 0 CHECK (score_relevance   BETWEEN 0 AND 5),
  score_alignment   INTEGER NOT NULL DEFAULT 0 CHECK (score_alignment   BETWEEN 0 AND 5),
  score_value       INTEGER NOT NULL DEFAULT 0 CHECK (score_value       BETWEEN 0 AND 5),
  score_timing      INTEGER NOT NULL DEFAULT 0 CHECK (score_timing      BETWEEN 0 AND 5),
  score_rationale   TEXT,
  stage             TEXT    NOT NULL DEFAULT 'spotted'
                            CHECK (stage IN ('spotted', 'qualifying', 'conversation',
                                             'proposal', 'won', 'lost', 'declined')),
  next_step         TEXT,
  next_step_on      TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities (stage, next_step_on);

-- Total is derived, never stored, so it can never disagree with its parts.
--
-- The reading is derived here too, and in one place, so the dashboard and the
-- tools cannot drift apart on what a score means.
--
-- Alignment has a veto. A zero there is not a number to be averaged away by a
-- good fee and good timing — it means the work would sit badly with what FMB
-- stands for, and no amount of the other three fixes that. Reputation compounds;
-- a single wrong association undoes a year of the right ones. Without this, a
-- lucrative misalignment scores 11 and reads "keep warm", which is precisely the
-- advice that costs the most.
DROP VIEW IF EXISTS opportunity_scores;
CREATE VIEW opportunity_scores AS
SELECT
  id, title, stage,
  score_relevance + score_alignment + score_value + score_timing AS total,
  score_relevance, score_alignment, score_value, score_timing,
  CASE
    WHEN score_alignment = 0 THEN 'decline politely'
    WHEN score_relevance + score_alignment + score_value + score_timing >= 14
      THEN 'worth your time'
    WHEN score_relevance + score_alignment + score_value + score_timing >= 9
      THEN 'keep warm'
    ELSE 'decline politely'
  END AS reading,
  CASE WHEN score_alignment = 0
       THEN 'Alignment is zero — this is a decline whatever the total says.'
       END AS veto,
  score_rationale, next_step, next_step_on
FROM opportunities;

-- ── Analytics ───────────────────────────────────────────────────────────────
-- Numbers FMB read off LinkedIn and entered, or that a future export filled in.
-- Nothing here is inferred: a metric with no source is not a metric.
CREATE TABLE IF NOT EXISTS analytics (
  id                INTEGER PRIMARY KEY,
  content_id        INTEGER REFERENCES content (id) ON DELETE CASCADE,
  measured_on       TEXT    NOT NULL,
  impressions       INTEGER,
  reactions         INTEGER,
  comments          INTEGER,
  reposts           INTEGER,
  profile_views     INTEGER,
  source            TEXT    NOT NULL DEFAULT 'manual_entry'
                            CHECK (source IN ('manual_entry', 'export', 'api')),
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (content_id, measured_on)
);

-- ── Assets ──────────────────────────────────────────────────────────────────
-- Paths only. No binaries enter this repository.
CREATE TABLE IF NOT EXISTS assets (
  id                INTEGER PRIMARY KEY,
  label             TEXT    NOT NULL,
  kind              TEXT    NOT NULL DEFAULT 'image'
                            CHECK (kind IN ('image', 'video', 'document', 'link')),
  location          TEXT    NOT NULL,   -- a Drive link or a local path, never a file
  usage_rights      TEXT,
  content_id        INTEGER REFERENCES content (id) ON DELETE SET NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Audit ───────────────────────────────────────────────────────────────────
-- Append-only in practice: the assistant writes here and never updates or
-- deletes. If an outward action ever happened, it is in this table.
CREATE TABLE IF NOT EXISTS activity_logs (
  id                INTEGER PRIMARY KEY,
  at                TEXT    NOT NULL DEFAULT (datetime('now')),
  actor             TEXT    NOT NULL DEFAULT 'assistant'
                            CHECK (actor IN ('assistant', 'fmb', 'system')),
  action            TEXT    NOT NULL,
  entity            TEXT,
  entity_id         INTEGER,
  approval_id       INTEGER REFERENCES approvals (id) ON DELETE SET NULL,
  outcome           TEXT    NOT NULL DEFAULT 'ok'
                            CHECK (outcome IN ('ok', 'refused', 'error')),
  detail            TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_at ON activity_logs (at DESC);

-- Anything that leaves this machine must name the approval that let it out.
CREATE TRIGGER IF NOT EXISTS external_action_needs_approval
BEFORE INSERT ON activity_logs
FOR EACH ROW
WHEN NEW.action LIKE 'external:%' AND NEW.outcome = 'ok' AND NEW.approval_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'an external action cannot be logged as done without an approval_id');
END;
