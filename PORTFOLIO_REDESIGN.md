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
- Headless Chromium verification at 1440, 768, 390, and 320 px: passed. All homepage images decode after natural scrolling; no horizontal overflow or JavaScript exceptions.
- CV entry and return, consultation disclosure and visible request windows: passed at all four widths.
- Reduced motion, direct writing anchor position, keyboard skip link, email/book destinations, and JavaScript-disabled homepage: passed.
- Desktop and mobile screenshots were visually inspected. The original photography, clear ivory/plum section sequence, typography and book treatment are retained. Sculptural forms use a lightweight local SVG with separate face, inner-surface and edge shading, replacing the initial flat CSS rings. This is a responsive interpretation of the concept, not a pixel-identical reproduction of the generated mockup.

## Verification follow-up fixes

Removed a stale reveal-animation flag that could hide consultation slots. Corrected the legacy route-hiding rule to expose the keyboard skip link. Prevented CV scroll padding from adding a second offset to homepage section links. Enlarged mobile navigation touch targets to 44 px.

Repeat browser checks with `node scripts/verify-portfolio.cjs` where Playwright and Chromium are installed. `PORTFOLIO_CHROMIUM_PATH` optionally selects an existing Chromium binary. The test starts its own local HTTP server on port 8766.

Physical iPhone/Safari verification and production deployment are not covered by the local Chromium checks. No merge or deployment has been performed.

## Button and destination audit

All distinct homepage section anchors and CV buttons were exercised in Chromium. Book, profile, services, reader preview, ebook-access and legal pages return HTTP 200 on the local repository server, with no JavaScript errors. Book mobile menu, purchase-section navigation, FAQ, email-order destinations and the case-study PDF pass. Added a portfolio return link to the book footer. Contact and book-order actions use existing email destinations; no message was sent and no order or calendar event was created.

External HTTP checks: Cognita and Masinloc responded 200. SENZ and canonical FMB domain routes returned 403 to automated requests; Partner Program returned 503. These responses do not establish an end-user outage, but external availability is not verified. FMB News is owned by its separate edge-routed repository and must not be copied into PCO.
