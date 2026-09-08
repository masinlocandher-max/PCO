<!-- PRIVATE. Never published. See memory/FMB_SECURITY_AND_APPROVAL.md. -->

# Publishing Workflow

## Two modes

**MODE 1 — `prepare_and_paste`.** The default, and the one in force today.
**MODE 2 — `official_linkedin_api`.** Publishing through an approved LinkedIn
developer application over OAuth. Supported, gated, and reached by the roadmap in
the README.

There is no third mode. Cookie or session-based automation of a logged-in account
is refused outright, in code, and a test scans the source so it cannot be added
quietly later.

## MODE 1 — the path in force today

1. Content agent drafts. Reputation agent reads it.
2. `content_prepare` formats and checks it: length against the 3,000 limit, the
   210-character feed truncation, hashtag count, insecure links.
3. It goes into the approval queue with its risk assessment.
4. FMB approves.
5. She copies the text and posts it herself. She adds the media, picks the
   moment, and reads the room — three things software does badly.
6. She pastes the post URL back in; analytics attach to it from there.

## MODE 2 — official API publishing

Steps 1 to 6 of the roadmap, all of which `readiness()` reports live:

- an approved developer application (`LINKEDIN_CLIENT_ID`)
- OAuth configured (`LINKEDIN_ACCESS_TOKEN`)
- the permission declared (`LINKEDIN_SCOPES` contains `w_member_social`) and
  confirmed by LinkedIn — a `403` is treated as the real answer, not the claim
- an author (`LINKEDIN_AUTHOR_URN`)
- `FMB_PUBLISH_MODE=official_linkedin_api`, `FMB_ALLOW_EXTERNAL=1`,
  `FMB_EXECUTE_FOR_REAL=1`
- and, per action, a claimed permit for that exact text

Miss any one and it refuses, names what is outstanding, and logs the refusal.
`sandbox_check()` rehearses the credential against a read-only endpoint first.

Even in MODE 2, steps 1 to 4 of the MODE 1 path are unchanged: the draft is still
written, checked, risk-assessed and approved by a person. MODE 2 only changes who
presses send.

## What is never automated

The timing. The media. The judgement about whether today is the day. Those are
the parts of publishing that actually matter.
