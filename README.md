# PCO — Application Profile

A standalone single-page profile prepared by **Francine Marie Bautista** for
communications work with the Presidential Communications Office of the
Philippines.

This is an independent personal application profile. It is not an official
PCO website and is not affiliated with, endorsed by, or produced for the
office.

## Files

```
index.html       the page
app.css          styles — no external fonts, no CDN, no framework
app.js           reveals, scroll progress, active nav, full-screen viewer
assets/
  favicon.svg    FMB monogram
  img/           portraits and work samples (see assets/README.md)
```

Nothing loads from a third party. The page works offline, opens directly
from the filesystem, and prints cleanly to PDF.

## Paths

All references are **relative**, so the folder can be served at any route
without rewriting anything — `/PCO`, a site root, or a GitHub Pages
subpath. Copying the folder into another site is a copy, not a migration.

## Structure

| # | Section | Job it does |
|---|---|---|
| — | Hero | Who, where, and what is being asked for |
| 01 | Position | The argument: public information is an access problem |
| 02 | Origin | Where the verification discipline came from — Masinloc |
| 03 | Practice | Capabilities, written specifically |
| 04 | Background | Education and teaching history |
| 05 | Presence | Front of the room, and behind it |
| — | Selected work | Commented out until assets are supplied |
| 06 | Contribution | Six concrete offers to the office |
| 07 | Regional | The case for a contact point outside Metro Manila |
| 08 | Closing | The line the reviewer should remember |

## Before this goes to anyone

1. Replace `CONTACT-EMAIL` in `index.html`.
2. Add assets per `assets/README.md` and uncomment the blocks marked
   `PORTRAIT:` / `PHOTO:` / `SELECTED WORK`.
3. Decide on the Ms Gay Zambales line in section 05 — see notes below.
4. `<meta name="robots" content="noindex,nofollow">` is set on purpose.
   Remove it only if this is meant to be publicly discoverable.

## Deliberate choices

- **No music gate.** The Miss Intercontinental page opened with one. On a
  government application it reads as decorative rather than serious, so the
  page opens directly.
- **Navy, paper and brass instead of plum and violet.** Institutional
  restraint, not pageant gloss. Flag colours were avoided on purpose —
  literal red-white-blue would look like an impersonation of a government
  site rather than a personal application.
- **The Ms Gay Zambales line is kept but demoted** to a single sentence in
  section 05, framed as message-delivery experience rather than pageantry.
  It is one paragraph, easy to delete if you would rather it not be there.
- **No invented credentials.** Every factual claim on the page comes from
  material you have already written about yourself. There are no
  statistics, awards, employers, or project names that you did not supply.
