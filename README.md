# Francine Marie Bautista — Portfolio

A self-contained, single-page portfolio. Strategist, creative director,
storyteller. Masinloc, Zambales, Philippines.

## Files

```
index.html   the page — nine chapters
app.css      styles: near-black / deep violet / rich plum, gold accents
app.js       opening frame, sound, motion engine, image viewer
assets/
  favicon.svg
  img/       15 photographs (see assets/README.md for provenance)
  audio/     the optional audio experience
  doc/       Masinloc Connect case study (PDF)
```

No CDN, no framework, no external fonts, no analytics. Nothing loads from
a third party, so the page cannot be broken by someone else's outage. All
paths are relative — the folder can be served at `/PCO`, at a site root,
or from a subpath without editing anything.

## Chapters

| # | Chapter | Pacing |
|---|---|---|
| — | Hero | slow, controlled, anticipatory |
| 01 | Presence | measured |
| 02 | Education | architectural — the timeline draws as you read |
| 03 | Service | quieter, documentary |
| 04 | Talent | more dynamic, opens to a cinematic frame |
| — | Identity sequence | Education → Service → Talent → the name |
| 05 | Selected work | confident, structured — Masinloc Connect |
| 06 | Professional value | restrained |
| 07 | Continuing journey | cinematic; the frame grows to full screen |
| 08 | Invitation | slows down |
| 09 | Final identity | minimal |

## Sound

The opening frame asks once: **enter with sound**, or **continue without
sound**. Audio never starts before that choice — the click is the user
gesture modern browsers require, so it works on iOS Safari.

The choice is not permanent. A sound control sits bottom-right for the
whole page and reverses it at any time, with a short fade and no reload.
Muting pauses without resetting position, so turning sound back on
continues the piece rather than restarting it. The preference is stored
locally and the opening frame is not shown again.

Browser autoplay policy still overrides a stored preference: a returning
visitor who chose sound may need to press the control once. That case is
handled quietly — the control stays usable and nothing throws.

**The silent version is a complete portfolio.** No information lives only
in the audio.

## Motion

All four states are supported independently: sound + motion, sound +
reduced motion, silent + motion, silent + reduced motion.

Under `prefers-reduced-motion: reduce`, the pinned sequences unpin into
plain stacked sections and every reveal resolves immediately. **Reduced
motion removes movement, never content** — verified, not assumed.

Two implementation notes:

- **No GSAP, ScrollTrigger, or Lenis.** Motion is one
  `requestAnimationFrame` loop writing transforms and custom properties.
  The CDN those libraries ship from is unreachable from the build
  environment, so their behaviour could not be verified before shipping,
  and unverified animation on a page whose whole job is a first
  impression is a bad trade. The vanilla implementation does the same
  work, was tested in a real browser, and adds no third-party dependency.
  Smooth-scroll hijacking was left out deliberately: the visitor controls
  the scroll speed.
- **Entrance reveals are swept by position, not by IntersectionObserver.**
  A fast flick or a smooth-scrolled anchor jump can carry an element past
  the viewport between observer callbacks; that element is then never
  reported as intersecting and stays clipped or transparent forever. This
  was reproduced during the build — 25 of 48 elements silently failed to
  appear. Sweeping by position cannot skip.

## Before this goes to anyone

1. **Replace `CONTACT-EMAIL`** in `index.html` — it is still a literal
   placeholder in the Invitation chapter.
2. `<meta name="robots" content="noindex,nofollow">` is set on purpose.
   Remove it only when this is meant to be publicly discoverable.
3. Read the audio note in `assets/README.md`.

## Accuracy

Every factual claim traces to source material: the Masinloc Connect case
study PDF in this repo, or material already written by the author. The
population figure (56,579) is the Philippine Statistics Authority 2024
POPCEN count, attributed as the case study attributes it. No credentials,
statistics, employers, awards, or project names were invented.
