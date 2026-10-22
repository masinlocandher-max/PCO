# Approved portfolio presentation

Implements the owner-approved ivory and deep-plum sectioning, editorial typography, original photography, and restrained satin sculptural forms.

## Journey

Introduction → selected work → practice → founder initiatives → professional presence → writing → enquiry.

The homepage uses `assets/css/portfolio-editorial.css`. Its selectors and colour variables are scoped to `.fmb-site`, leaving the CV presentation separate. Satin forms are lightweight CSS rather than large generated images. Original repository photos, logos, wordmark, and cover artwork are reused unchanged.

The three-part practice framework and homepage headlines are presentation copy, not changes to the professional CV. Masinloc scope follows the repository case study; work photos are labelled as context, not product screenshots. No outcome metrics were added. Book copy follows the existing book landing page.

The homepage preserves the existing contact email, external initiative destinations, book destination, and Full CV interaction. Consultation request windows remain available in a disclosure with explicit confirmation language. Writing has its own hash route. Motion is limited to a small desktop portrait offset, with reduced-motion support; no copy is hidden pending animation. The large project image is sticky on desktop and returns to natural document order on mobile.

## Validation

- `python scripts/validate-site-assets.py`: passed.
- `BASE_SHA=2070149965644182aee627e05278760cef53a7cd python scripts/check-cv-lock.py`: passed; protected CV block unchanged.
- JavaScript syntax checks: passed.
- Static homepage anchor / local asset checks: passed.
- Browser screenshots and interaction checks remain pending: Playwright is available, but the Chromium download returned truncated archives in the implementation environment.

Before release, verify desktop and phone rendering, section anchors, contact, `/#cv` and return navigation, keyboard focus, reduced motion, and consultation disclosure. The site has not been deployed by this change.
