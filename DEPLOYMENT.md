# Francine Marie Bautista production deployment

This repository is the canonical static source for the public Francine Marie Bautista website.

## Public architecture

- Repository: `masinlocandher-max/PCO`
- Branch: `main`
- Production host: GitHub Pages
- Canonical domain: `https://francinemariebautista.com`
- Homepage: `index.html`
- Full curriculum vitae experience: `cv.html`
- Filipino Media Bulletin repository: `masinlocandher-max/FMBNews`
- Filipino Media Bulletin route: `https://www.francinemariebautista.com/news/`
- Framework/runtime: none; static HTML, CSS, JS and local assets

The root homepage is indexable. The preserved CV experience retains its own prior crawler metadata unless explicitly changed later.

## Hard deployment boundary

The following architecture is mandatory and must not be silently changed by Vercel, GitHub integrations, automation, or future agents:

1. `masinlocandher-max/PCO` owns `francinemariebautista.com` and `www.francinemariebautista.com` as the main public website.
2. `masinlocandher-max/FMBNews` owns the `/news/` application and its assets.
3. `masinlocandher-max/FMB-Ecosystem` has no production role for these domains or the `/news/` route.
4. A Vercel project sourced from `FMB-Ecosystem` must never be used as the production source, origin, proxy, redirect target, or domain owner for `francinemariebautista.com`, `www.francinemariebautista.com`, or `/news/`.
5. The canonical newsroom route is `/news/`. `/fmbnews` is not a canonical public route.

If a hosting dashboard shows one of the canonical domains attached to an `FMB-Ecosystem`-sourced project, that attachment is a configuration error and must be removed rather than treated as authoritative.

## Homepage routing

On every homepage load, a transparent route confirmation asks whether the visitor is looking for:

1. Curriculum Vitae
2. Filipino Media Bulletin

Choosing Curriculum Vitae reveals the professional homepage and provides a direct link to the full CV experience in `cv.html`. Choosing Filipino Media Bulletin opens the existing FMB News route on `www`.

## Consultation intake

The homepage publishes a deliberately limited set of consultation request windows for September–November 2026.

This is **not** a fake “booked calendar.” The public site exposes only selected windows while the private Google Calendar remains authoritative. Each released slot opens a Google Calendar event request addressed to `withlovefmb@gmail.com`; email remains available as the fallback contact.

Office by appointment:
`32nd St cor 11th Ave, Bonifacio Global City, Taguig`

## Photography source of truth

The Google Drive folder **FMB About Me Consultant** is authoritative for photographs and source media. Repository WebP files are optimized derivatives only. A photograph removed from Drive must not remain shipped in this repository.

## Domain / DNS

`CNAME` is set to `francinemariebautista.com`.

GitHub Pages still requires the domain's DNS in Cloudflare (or the active DNS provider) to point the apex domain to GitHub Pages. Do not repoint or remove `www` until the Filipino Media Bulletin `/news/` route has been verified under the intended final DNS architecture.

## Deployment

`.github/workflows/deploy-pages.yml` deploys every push to `main`.

GitHub Pages was enabled for this repository on September 4, 2026, using GitHub Actions as the deployment source. The custom domain `francinemariebautista.com` was also entered in the Pages settings. A fresh push should be used to validate the custom-domain deployment state rather than re-running an existing workflow attempt, because a same-run retry can create duplicate `github-pages` artifacts.
