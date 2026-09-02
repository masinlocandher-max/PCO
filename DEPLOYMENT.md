# PCO Production Deployment

This repository is the canonical source for Francine Marie Bautista's standalone PCO portfolio/application dossier.

## Deployment status (2 Sept 2026)

Neither hosting path is serving the site yet. Both are blocked on a step
that cannot be performed from the repository or an API token:

- **GitHub Pages** — the workflow in `.github/workflows/deploy-pages.yml`
  is correct, but all four runs failed at `Configure Pages`, because Pages
  has never been enabled for this repository. `GITHUB_TOKEN` can deploy to
  an existing Pages site but cannot create one; that needs repo-admin
  scope, so `enablement: true` fails with *"Create Pages site failed.
  Resource not accessible by integration"*. **Fix: Settings → Pages →
  Build and deployment → Source: GitHub Actions.** One toggle, once. The
  next push to `main` then deploys, or re-run the latest workflow.
- **Lovable** — project `614aae88-27b3-4aa9-9442-56e4a1dcc462` returns
  `404 project_not_found`, so the recorded fallback URL is not serving.
  Re-create or re-link the project, then update the ID below.

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
