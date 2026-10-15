<!--
  PRIVATE. This file is never published. The PCO deploy excludes
  linkedin-ai-assistant/ and fails the build if that exclusion is removed
  (.github/workflows/deploy-pages.yml, guarded by scripts/validate-site-assets.py).

  Two markers are used throughout and both are load-bearing:

    VERIFIED   — checked against the PCO repository or stated by FMB directly.
    [TO CONFIRM: ...] — the assistant does NOT know this. Never fill one of these
                        in by inference. An unfilled field is retrieved as
                        "unconfirmed" and must be raised with FMB, not guessed.
-->

# FMB — Security and Approval

## The one-sentence version

Nothing leaves this machine without Francine's name on the decision.

## Where that is enforced

Not in a prompt — prompts can be talked around. In three places that cannot:

1. **The schema.** `approvals` cannot reach `approved` without a decider and a
   timestamp. `content` cannot reach `published` without an approval id. A
   trigger refuses to log a completed external action that has no approval.
2. **`approval_manager.claim()`.** The only way to obtain permission to act. It
   works once per approval, refuses anything not approved, and expires an
   approval older than 72 hours — because a yes given three weeks ago was given
   about a different week.
3. **`linkedin_client`.** Refuses unless external actions are allowed, execution
   is armed, a credential exists, and a valid permit is presented. Dry run is
   the default, so forgetting a setting fails safe.

## Credentials

- Environment variables only. Never a file, never the database, never a log.
- There is no column anywhere in the schema that could hold one.
- `config.redact()` scrubs anything credential-shaped from every log line and
  every error message before it is written or returned.
- `.env` is git-ignored. `.env.example` carries names and empty values only.
- The assistant reports whether a credential is present. It never reports what
  it is, and there is no tool that returns one.

## What is deliberately not collected

No email addresses, phone numbers or postal addresses in `contacts`. A
relationship memory needs a name, a role and what was said. Everything beyond
that is a liability with no matching benefit.

## Audit

Every draft, submission, decision, claim, refusal and error is appended to
`activity_logs`. Nothing updates or deletes from it. If an outward action ever
happened, it is there, with the approval that permitted it.

## If something goes wrong

1. Turn off `FMB_ALLOW_EXTERNAL`. Everything outward stops immediately.
2. Read `activity_log` — it will say what was attempted and under whose approval.
3. Rotate any credential that was configured, from LinkedIn's side.
4. The local database can be deleted without losing anything published; it holds
   working state, not the record of her career.
