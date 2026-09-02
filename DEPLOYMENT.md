# PCO Production Deployment

This repository is the canonical source for Francine Marie Bautista's standalone PCO portfolio/application dossier.

## Current production

- Hosting: Lovable
- Lovable project: `614aae88-27b3-4aa9-9442-56e4a1dcc462`
- Lovable project slug: `francine-pco-showcase`
- Published fallback URL: `https://francine-pco-showcase.lovable.app`
- Custom domain target: `https://pco.francinemariebautista.com`
- Search behavior: `noindex,nofollow`
- Main website relationship: standalone; do not add navigation from or to the main Francine Marie Bautista website unless explicitly approved.

## Branches

- `main`: canonical static source and assets.
- `lovable-production`: production deployment record based on the same static source. Keep this branch aligned with what is approved for Lovable hosting.

## Domain

The PCO project should use the subdomain `pco.francinemariebautista.com`, not the apex `francinemariebautista.com`, so the main website remains technically separate.

Lovable currently requires the custom domain to be attached from Project Settings → Domains. The DNS zone is on Cloudflare. Use Lovable's Cloudflare/proxy setup and copy the generated CNAME target and TXT verification value into Cloudflare DNS. Do not change the apex or `www` records for this PCO deployment.

## Preservation rule

The visual design, page content, section order, photographs, audio behavior, motion, reduced-motion handling, contact information, linked case-study PDF, and noindex/nofollow behavior are locked unless explicitly changed by Francine Marie Bautista.
