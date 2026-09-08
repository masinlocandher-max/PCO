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

# FMB — Project Context

What the assistant is allowed to say about each venture. Anything not recorded
here is not known, and "not known" is the answer it gives.

## SENZ Strategic Communications and Digital Solutions — APPROVED

- **Full name:** SENZ Strategic Communications and Digital Solutions
- **Positioning:** *We make them clearer, sharper, and harder to ignore.*
- **Capabilities:** strategic communications · branding · PR · content strategy ·
  digital solutions · reputation and perception work.

**Hard rule:** do not invent clients, case studies, revenue, partnerships or
achievements. If a draft would be stronger with a named client, the answer is to
ask FMB whether one can be named — never to imply one.

- [TO CONFIRM: FMB's stated role and title at SENZ, for accuracy in a byline.]
- [TO CONFIRM: whether SENZ is open for new business right now, and to whom.]

## Masinloc Connect — APPROVED

- **Canonical positioning:** *Masinloqueños to the world.*
- **Supporting line:** *Connecting Masinloqueños to the world.*
- **Community-facing philosophy:** *For Masinloqueños, With Masinloqueños.*
- **What it is:** a community technology ecosystem.
- **What it is NOT:** an LGU portal. Never describe it as an official government
  system unless that status is actually established. This is a hard rule — the
  claim is both untrue today and the kind of error that damages trust locally.

**Core areas:** Discover · Sambal Tina · Marketplace · Verified History ·
Leadership · Help Desk · Jobs and Opportunities · Seller tools · Community and
emergency-related services.

**Architecture principle:** the website is the source-of-truth layer; the app is
the action layer.

**Purpose:** preserve and promote Sambal Tina · make verified Masinloc history
accessible · create access to jobs and opportunities · support local sellers and
commerce · improve practical community access to information and services.

- [TO CONFIRM: public URL, and current stage — live, in build, or in pilot.]

## Cognita Institute — APPROVED

- A **private, non-degree education initiative**.
- **Focus:** AI education · AI literacy · future-ready skills · practical AI
  capability · workforce development.
- **Program directions:** self-paced AI Foundations; a guided learning program.

**Hard rule:** never describe Cognita as an accredited college, university, or
degree-granting institution. Non-degree is part of what it is, not a caveat to
be softened.

- [TO CONFIRM: who the programs are for, and whether enrolment is open.]

## FMB News — APPROVED

- **Brand:** FMB News — *Filipino Media Bulletin*
- **Tagline:** *Information with Purpose.*
- **Editorial principles:** verified facts · visible sources · meaningful context
  · clear explanations.
- **Never** optimise FMB News for sensationalism or unsupported speed.
- Occupies francinemariebautista.com/news/, served from `masinlocandher-max/FMBNews`
  at the Cloudflare edge. — VERIFIED

## The Right Way to Live — APPROVED / VERIFIED

- Title: *The Right Way To Live*. Author: Francine Marie Bautista.
- Formats: eBook and pocketbook.
- Ebook ₱499; printed pocketbook ₱999 with nationwide Philippine shipping. — VERIFIED
- Ebook access activates only after payment is verified. — VERIFIED
- Site line: "For the things nobody teaches you properly." Cover subtitle:
  "A gentler, stronger, more meaningful life." — VERIFIED
- Themes: choices, ambition, boundaries, money, beauty, work, service,
  relationships. — VERIFIED

**Hard rule:** manuscript contents and the protected reader and access systems
are private unless explicitly cleared for public use. The text is never quoted at
length, and never enters this repository.
