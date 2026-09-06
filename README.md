# Francine Marie Bautista — Canonical Portfolio

This repository (`masinlocandher-max/PCO`) is the canonical source for the root website at `francinemariebautista.com` and `www.francinemariebautista.com`.

## Deployment ownership

- `masinlocandher-max/PCO` owns the root portfolio and CV experience.
- `masinlocandher-max/FMBNews` owns `/news/` and its newsroom routes at the Cloudflare edge.
- PCO must not contain a local `news/` directory or copy FMB News production files.
- PCO must not contain Vercel project metadata or a `vercel.json` production binding.
- The root custom domain is declared by `CNAME` and is intended to resolve to the GitHub Pages deployment of this repository.

## Current experiences

- `/` — three-choice entry into the professional CV, FMB News, or the book storefront.
- `/cv.html` — compatibility entry that routes into the main one-page CV experience.
- `/book/` — storefront for *The Right Way to Live*.
- `/book/reader.html` — protected preview reader with a server-side entitlement integration point for future verified purchase access.

## Asset policy

Portfolio photography is sourced from the approved Google Drive masters and shipped as optimized local WebP derivatives. `scripts/validate-site-assets.py` is the release guard for broken WebP binaries, undersized primary CV portraits, and missing local HTML references.

## Production note

The repository may deploy successfully to GitHub Pages while the public domain still resolves through another provider. The deployment workflow treats provider ownership as a separate production verification gate and fails if Vercel is still serving the canonical root or if the FMB News Worker is not confirmed on `/news/`.
