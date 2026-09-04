# Francine Marie Bautista production deployment

This repository is the canonical static source for the public Francine Marie Bautista website.

## Public architecture

- Root website repository: `masinlocandher-max/PCO`
- Root branch: `main`
- Root production host: GitHub Pages
- Root canonical domain: `https://francinemariebautista.com`
- Homepage: `index.html`
- Full curriculum vitae experience: `cv.html`
- News repository: `masinlocandher-max/FMBNews`
- News production route: `https://www.francinemariebautista.com/news/`
- News delivery: Cloudflare Worker `fmb-news` bound to `/news*`
- Framework/runtime for PCO: none; static HTML, CSS, JS and local assets

The root homepage is indexable. The preserved CV experience retains its own crawler metadata unless explicitly changed later.

## Canonical ownership relationship

The ownership model is strict:

1. `masinlocandher-max/PCO` owns the root website at `francinemariebautista.com` and `www.francinemariebautista.com` outside `/news*`.
2. `masinlocandher-max/FMBNews` owns `/news*` and all FMB News assets, article routes, archive routes, feeds and newsroom products below that path.
3. Cloudflare attaches the FMBNews Worker directly to `/news*`. PCO does not proxy, rewrite, copy, build or embed FMBNews into its GitHub Pages artifact.
4. Vercel has no production role in the PCO-to-FMBNews relationship. No `vercel.json` or `.vercel` configuration belongs in this repository.
5. `masinlocandher-max/FMB-Ecosystem` has no production role for these domains or the `/news/` route.
6. The canonical newsroom route is `/news/`. `/fmbnews` is not a canonical public route.

If a hosting dashboard shows one of the canonical domains attached to an unrelated project, that attachment is a configuration error and must be removed rather than treated as authoritative.

## Deployment boundary

`.github/workflows/deploy-pages.yml` deploys only the PCO root files to GitHub Pages. It intentionally does not check out, build or stage FMBNews.

The workflow verifies the relationship after deployment:

- the root site must load from the PCO deployment;
- `https://www.francinemariebautista.com/news/` must return FMB News content;
- the `/news/` response must expose `X-FMB-News-Worker: fmb-news`, confirming Cloudflare/FMBNews ownership.

FMBNews has its own build, verification and Cloudflare deployment workflow in the FMBNews repository.

## Consultation intake

The homepage publishes a deliberately limited set of consultation request windows for September–November 2026.

This is not a fake booked calendar. The public site exposes only selected windows while the private Google Calendar remains authoritative. Each released slot opens a Google Calendar event request addressed to `withlovefmb@gmail.com`; email remains available as the fallback contact.

Office by appointment:
`32nd St cor 11th Ave, Bonifacio Global City, Taguig`

## Photography source of truth

The Google Drive folder **FMB About Me Consultant** is authoritative for photographs and source media. Repository WebP files are optimized derivatives only. A photograph removed from Drive must not remain shipped in this repository.

## Domain and DNS

`CNAME` is set to `francinemariebautista.com` for the GitHub Pages root site.

DNS remains responsible for sending the root site to the intended Pages origin while Cloudflare route matching sends `/news*` requests to the FMBNews Worker. Do not implement `/news` through a Vercel rewrite or a second copied newsroom deployment.

## Deployment

GitHub Pages is configured from GitHub Actions on `main`. A fresh push is the correct way to validate the custom-domain deployment state. FMBNews deployment remains independent and is validated by the FMBNews repository's Cloudflare workflow.
