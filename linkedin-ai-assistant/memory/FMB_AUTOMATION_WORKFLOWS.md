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

# FMB — Automation Boundaries

## What is automated

Retrieval, drafting, scoring, tracking, reminding, reporting. Everything that
happens on FMB's own machine and produces something for her to read.

## What is gated, not forbidden

Publishing and commenting can happen through LinkedIn's **official** API, once an
approved developer application, OAuth and the granted permission exist, FMB has
explicitly enabled it, and each individual action carries her approval. That is
MODE 2, and it is a supported destination rather than a door that stays shut.

The default remains MODE 1 — prepare and paste — even after MODE 2 is available.
Switching modes is a deliberate act, not a drift.

## What is never automated, in either mode

Anything driving a logged-in session: cookies, `li_at`, session tokens, headless
browsers, unofficial endpoints. Not "not yet" — never. Those risk the account
this system exists to protect, and no volume of convenience justifies it.

Also never automated in either mode: messaging, connecting, following, reacting,
accepting or declining. Those stay with FMB.

## The standing loops

- **Daily** — what is waiting for approval, and which follow-ups are due today.
- **Weekly** — draft the next batch of content; review the opportunity list;
  surface relationships going dormant.
- **Monthly** — what travelled, what did not, what she is becoming known for,
  and one recommendation about what to change.

Each produces a document. None of them acts.

## Where a scheduler is allowed

Only to run the local loops above and put their output in front of her. A
scheduler that could publish is a scheduler that will publish on the wrong day,
about the wrong thing, while she is asleep.
