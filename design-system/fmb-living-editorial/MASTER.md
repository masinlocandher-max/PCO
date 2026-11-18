# FMB Living Editorial — UI/UX Pro Max Design System
Status: Proposed design system for review. No production or CV changes.

## Product and purpose
Canonical portfolio: francinemariebautista.com. Primary conversion: qualified consulting inquiries. Secondary: demonstrate creative leadership and direct visitors to the FMB&CO ecosystem.

## Non-negotiable repository boundaries
- Respect AGENTS.md CV_LOCK_START/CV_LOCK_END and all protected CV assets and routes.
- Preserve root ownership, GitHub Pages routing, /news edge ownership, and existing SEO/entity identity.
- Use approved repository images and verify their provenance against FMB About Me Consultant Drive masters before replacing anything.
- No synthetic portraits, fabricated client outcomes, placeholder case studies, or invented credentials.
- Preserve all working links, keyboard access, and reduced-motion alternatives.

## Creative concept: The Living Editorial
A premium editorial publication that behaves like a responsive exhibition. Typography, authentic portraiture, archival textures, and intentional motion reveal the thinking behind the work. Not a generic dark SaaS landing page, uniform bento template, glass-card overload, or decorative animation reel.

## Visual direction
- Retain the site's existing near-black base as a reference, but develop a small semantic token system from real imagery and brand assets.
- Use high-contrast display typography for editorial moments and highly legible body typography for service explanation.
- Alternate expressive compositions with disciplined reading zones. Use asymmetry, crop, negative space, and scale changes deliberately.
- Give each project a distinct visual world without sacrificing a common navigational grammar.
- Keep brand logos original, without recreating them as initials.

## Homepage narrative
1. Identity / proposition: unmistakable portrait, strong claim, immediate consultation and work routes.
2. Point of view: a concise strategic thesis; avoid redundant manifesto copy.
3. Selected work: lead with verifiable evidence, role, problem, intervention, and visible outcome where documented.
4. Practice: clarify exactly what can be commissioned, who it serves, and what a collaboration produces.
5. FMB&CO ecosystem: an intelligible relationship between SENZ, Cognita, FMB News, and community initiatives. Do not imply legal or operational relationships not documented.
6. About: biography and context grounded in the canonical profile, without duplicating protected CV.
7. Contact: low-friction next step and clear expectations.

## Motion specification
- Treat scrolling as narrative pacing, not a prerequisite to reading.
- Prefer opacity and transform for smooth performance; use pinning only when it improves comprehension.
- Stage portrait, typography, and project reveals with varied rhythm and restrained transitions.
- No forced scroll hijacking, auto-playing sound, mandatory intro gate, or motion that conceals content.
- Respect prefers-reduced-motion; make all content and links usable without JavaScript.

## UX and accessibility gates
- WCAG AA text contrast; minimum 44x44 CSS-pixel touch targets where practical.
- Visible focus styles; semantic landmarks; useful image alt text; predictable anchors and back behavior.
- Responsive checks at 320, 375, 768, 1024, and 1440 CSS px; no horizontal overflow.
- Image dimensions or aspect ratios reserved to avoid layout shift; responsive image loading and formats.
- Verify that sticky elements do not obscure anchors or focus.
- Test navigation, CTAs, CV link, booking links, and every ecosystem destination.
- Validate assets with scripts/validate-site-assets.py before deployment.

## Implementation sequence
Phase A: inventory current components, CSS, scripts, interaction and performance behavior; capture desktop/mobile screenshots.
Phase B: produce two visually distinct concepts grounded in real images and choose one.
Phase C: implement tokens, typography, responsive compositions, motion and accessible navigation on a review branch.
Phase D: test visual regression, reduced motion, touch, keyboard, links, performance and SEO.
Phase E: merge only after review and deployment-provider ownership verification.

## Acceptance criteria
- Visitors can identify who Francine is, what she offers, and where to inquire within the opening screen.
- Work examples substantiate claims and visibly distinguish projects.
- The ecosystem is clear without becoming a confusing directory.
- Mobile composition is designed intentionally, not simply stacked.
- Motion improves meaning and never blocks content.
- CV-protected content is byte-for-byte unchanged.
- No production deployment until the visual and functional QA gates pass.
