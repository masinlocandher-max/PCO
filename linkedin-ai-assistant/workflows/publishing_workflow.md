<!-- PRIVATE. Never published. See memory/FMB_SECURITY_AND_APPROVAL.md. -->

# Publishing Workflow

## The honest position first

LinkedIn does not give individuals posting access. Writing to a personal profile
needs the Community Management API and an approved developer application. Until
FMB has that, **there is no supported way for software to post as her**, and
anything claiming otherwise is either driving her account with a stolen session —
against LinkedIn's terms, and risking the account this system exists to protect —
or it is lying.

So the normal path is prepare-and-paste. That is the design, not a workaround.

## The normal path

1. Content agent drafts. Reputation agent reads it.
2. `content_prepare` formats and checks it: length against the 3,000 limit, the
   210-character feed truncation, hashtag count, insecure links.
3. It goes into the approval queue with its risk assessment.
4. FMB approves.
5. She copies the text and posts it herself. She adds the media, picks the
   moment, and reads the room — three things software does badly.
6. She pastes the post URL back in; analytics attach to it from there.

## The API path, if she is ever granted access

Nothing above changes. `linkedin_client.publish()` requires, all four:

- `FMB_ALLOW_EXTERNAL=1`
- `FMB_EXECUTE_FOR_REAL=1` (otherwise every call is a dry run)
- a credential in the environment
- a valid, unspent `Permit` from `claim()`

Miss any one and it refuses and logs the refusal. The default state is safe.

## What is never automated

The timing. The media. The judgement about whether today is the day. Those are
the parts of publishing that actually matter.
