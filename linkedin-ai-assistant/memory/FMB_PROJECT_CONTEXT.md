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

## The Right Way to Live — VERIFIED

- A book by Francine Marie Bautista, sold at francinemariebautista.com/book/
- Ebook ₱499. Printed pocketbook ₱999, nationwide Philippine shipping included.
- Ebook access activates only after payment is verified.
- Private reader app at /ebook/, opened from a personal access link.
- Positioning line on the site: "For the things nobody teaches you properly."
- Cover subtitle: "A gentler, stronger, more meaningful life."
- Themes covered in the book: choices, ambition, boundaries, money, beauty,
  work, service, relationships.
- **Manuscript rule:** the text lives in Drive and behind the entitlement
  endpoint. It is never quoted at length publicly, and never enters this repo.

## FMB News — PARTIALLY VERIFIED

- Occupies francinemariebautista.com/news/, served from a separate repository
  (`masinlocandher-max/FMBNews`) at the Cloudflare edge. — VERIFIED
- Describes itself as a "Filipino Media Bulletin". — VERIFIED
- [TO CONFIRM: what FMB News is editorially — its remit, who writes it, its
  publishing standards, and how she wants it described in one sentence.]

## SENZ Strategic Communications

- [TO CONFIRM: what SENZ does, who it serves, what it sells, its stage, and
  FMB's role in it. Nothing about SENZ is known to this system.]

## Masinloc Connect

- [TO CONFIRM: what it is, who it serves, and its relationship to Masinloc as a
  place and a community. Nothing is known to this system.]

## Cognita Institute

- [TO CONFIRM: what it teaches or researches, who it is for, accreditation or
  standing if any, and FMB's role. Nothing is known to this system.]

## Why these are blank

The assistant was built without access to any of it. Writing a plausible mission
statement here would mean the assistant later repeats an invention as FMB's own
positioning, in public, in her voice — which is a worse failure than an empty
field. Fill these in and the content engine gets sharper immediately.
