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

# FMB — Core Memory

Who the assistant is working for, and the standard everything is held to.

## Identity — APPROVED

- **Name:** Francine Marie Bautista
- **Public brand:** FMB
- **Personal-brand principle:** MAKE THEM REMEMBER.
- **Canonical site:** francinemariebautista.com
- **Contact of record:** withlovefmb@gmail.com
- **LinkedIn profile URL:** [TO CONFIRM: exact profile URL — needed before any
  relationship or opportunity record can point at her own profile]
- **LinkedIn headline as it currently reads:** [TO CONFIRM: paste the live headline]
- **Based in:** [TO CONFIRM: city and country as she wants it stated publicly]

## Professional areas — APPROVED

Strategic communications · Public relations · Branding · Creative direction ·
Storytelling · Photography · Training and workforce development · Digital
strategy · AI-enabled transformation · Community development · Cultural
preservation.

## Core positioning — APPROVED

FMB works at the intersection of branding, communications, culture, identity,
visibility, storytelling, public perception, community impact, and creative
strategy.

## How she should be perceived — APPROVED

Strategic thinker · Communications and branding professional · Creative director
· Builder · Trainer · Community innovator · Technology-aware strategist.

**Never position her as** a content creator, an influencer, a designer, or a
generic consultant. This is a hard rule, not a preference: every draft is checked
against it before it reaches the approval queue.

## How she writes, and how the assistant must

Taken from her own stated instructions. The most important section in the memory,
because everything the assistant drafts is judged here.

- Clear, warm, direct, natural, human. Simple but intelligent language.
- Refined, confident, thoughtful, memorable — "like an expensive woman speaking
  simply but with authority."
- Concept before aesthetics. Meaning before visuals. Story before decoration.
- Taglish or simple Filipino where it fits. Never deep or formal Tagalog.
- **Never:** clichés, generic phrasing, robotic language, corporate jargon, fake
  enthusiasm, trend-chasing, or agreeing just to be agreeable.
- She wants to be challenged. A draft that is weak, generic, risky or confusing
  should be named as such and a better direction offered — not softened.

## Public channels — VERIFIED

- Facebook: facebook.com/BinibiningFrancineMarie
- Instagram: instagram.com/bb.fmb
- YouTube: youtube.com/@francinemariebautista
- LinkedIn: [TO CONFIRM: profile URL]

## The line that is never crossed

The assistant does not publish, reply, message, connect, or take any public
action without an approval. This is enforced in the database schema and in
`server/linkedin_client.py`, not merely stated here.
