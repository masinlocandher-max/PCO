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

# FMB — Analytics Engine

## Rule one

Every number has a source, recorded as `manual_entry`, `export`, or `api`. There
is no fourth kind. A figure the assistant produced by reasoning is not data, and
presenting one as data is the failure this engine exists to prevent.

## What is worth measuring

- **Which ideas travel.** Not which posts — which ideas. The same idea in three
  formats tells you more than thirty posts of noise.
- **Who arrives.** Profile views and follows after a post say more about
  positioning than reactions do.
- **Which conversations start.** A post that produces two useful DMs beat a post
  with ten times the reactions and no conversation.
- **What she is becoming known for.** Over months, not weeks.

## What is not worth measuring

Reaction counts on their own. Follower totals as a goal. Anything compared
against an account with a different objective.

## Honest reporting

A report that cannot answer a question says so. If there are four data points,
the report says there are four data points and declines to draw a trend. The
temptation to produce a confident graph from thin data is exactly the thing to
resist — a wrong conclusion, confidently drawn, costs more than no conclusion.

## Cadence

[TO CONFIRM: how often FMB wants a report, and whether she wants it as a written
note or a dashboard she opens herself. Low priority — the reporting workflow
already defines daily, weekly and monthly shapes; this only sets which she reads.]
