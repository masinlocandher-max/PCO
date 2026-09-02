# PCO Production Deployment

This repository is the canonical source for Francine Marie Bautista's standalone PCO portfolio/application dossier.

## Target production architecture

PCO follows the same static-site model used for the Intercontinental application project:

- Source of truth: `masinlocandher-max/PCO` branch `main`
- Production host: GitHub Pages
- Custom domain: `https://pco.francinemariebautista.com`
- DNS target: `masinlocandher-max.github.io`
- Framework/runtime: none; plain `index.html`, `app.css`, `app.js`, and local assets
- Search behavior: `noindex,nofollow`
- Main FMB website relationship: standalone and not linked from the main site
- Lovable: editing/preview only, not the intended production serving layer

The repository includes `CNAME` with `pco.francinemariebautista.com` and `.nojekyll` so GitHub Pages serves the static files without a Jekyll build layer.

## One-time GitHub Pages activation

`.github/workflows/deploy-pages.yml` deploys every push to `main`, but GitHub Pages must first be enabled once in the repository UI:

`Settings -> Pages -> Build and deployment -> Source: GitHub Actions`

The GitHub integration token can deploy to an existing Pages site but cannot create the Pages site itself. Previous workflow attempts failed at `Configure Pages` for that reason. After the one-time setting is enabled, the existing workflow can deploy without changing the site code.

## DNS

In the DNS zone for `francinemariebautista.com`, use only the PCO subdomain:

- Type: `CNAME`
- Name/Host: `pco`
- Target: `masinlocandher-max.github.io`

Do not change the apex `francinemariebautista.com` or `www` records for PCO. If Cloudflare is managing DNS, keep the record DNS-only while GitHub validates the domain and provisions HTTPS.

## Lovable preview

The Lovable project may remain available as an editing or preview surface during migration, but it is not the target public architecture. Once `pco.francinemariebautista.com` is confirmed live from GitHub Pages, the Lovable-hosted URL is optional and can be unpublished.

## Preservation rule

The visual design, page content, section order, photographs, audio behavior, motion, reduced-motion handling, contact information, linked case-study PDF, and `noindex,nofollow` behavior are locked unless explicitly changed by Francine Marie Bautista.
