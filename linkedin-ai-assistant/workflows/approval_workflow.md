<!-- PRIVATE. Never published. See memory/FMB_SECURITY_AND_APPROVAL.md. -->

# Approval Workflow

## The path, and the only path

    draft → pending_review → approved → claimed (once) → executed
                          ↘ rejected → redraft → pending_review
                          ↘ expired after 72h

## Who does what

| Step | Who | What happens |
|---|---|---|
| draft | assistant | `approval_manager.draft()` records the exact text |
| review | assistant | reputation agent adds risk and notes |
| pending_review | assistant | `submit()` puts it in FMB's approval centre |
| approve / reject | **FMB** | `approve(by=...)` — a named human, always |
| claim | assistant | one-time permit; the row is spent in the same transaction |
| execute | gated | only through `linkedin_client`, only with the permit |

## Rules that are enforced, not requested

- An approval cannot reach `approved` without a decider and a timestamp — a
  schema CHECK, not a convention.
- A permit works once. A second `claim()` on the same row is refused and logged.
- Approvals older than 72 hours expire. A yes given about last week's context is
  not a yes about today's.
- A completed external action cannot be logged without an approval id — a
  database trigger refuses the insert.

## What FMB sees when deciding

The exact text that would go out. Where it would go. The risk level and why.
Who drafted it and when. Nothing summarised, nothing paraphrased — the payload
she approves is byte-for-byte the payload that could be sent.

## Emergency stop

Unset `FMB_ALLOW_EXTERNAL`. Every outward path refuses immediately, and each
refusal is logged.
