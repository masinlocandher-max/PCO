# CV LOCK

Status: LOCKED
Owner: Francine Marie Bautista
Repository: masinlocandher-max/PCO
Protected route: /#cv

## Purpose
This lock prevents automated tools, coding agents, refactors, redesigns, and unrelated site work from silently changing the owner's professional CV.

## Protected text
The protected CV text is the section of `index.html` between:
- `CV_LOCK_START`
- `CV_LOCK_END`

The redirect file `cv.html` is also protected.

## Protected CV assets
- assets/img/book-author-approved.jpeg
- assets/img/education-graduation.webp
- assets/img/service-01.webp
- assets/img/service-02.webp
- assets/img/service-03.webp
- assets/img/service-04.webp
- assets/img/talent-keynote.webp
- assets/img/work-desk.webp
- assets/img/work-field.webp
- assets/img/work-press.webp
- assets/img/work-media.webp

## Lock-control files
- AGENTS.md
- .github/CV_LOCK.md
- .github/CODEOWNERS
- .github/workflows/cv-lock.yml
- scripts/check-cv-lock.py

## Unlock rule
Protected CV content may be changed only when Francine Marie Bautista gives an explicit instruction in the current task to update or unlock the CV. Unrelated redesign, cleanup, modernization, refactoring, or optimization does not count as authorization.

The repository is currently public. This lock protects integrity, not confidentiality.
