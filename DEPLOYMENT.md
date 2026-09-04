# Francine Marie Bautista production deployment

This repository is the canonical static source for the public Francine Marie Bautista website.

## Public architecture

- Repository: `masinlocandher-max/PCO`
- Branch: `main`
- Production host: GitHub Pages
- Canonical domain: `https://francinemariebautista.com`
- Homepage: `index.html`
- Full curriculum vitae experience: `cv.html`
- Filipino Media Bulletin route: `https://www.francinemariebautista.com/news/`
- Framework/runtime: none; static HTML, CSS, JS and local assets

The root homepage is indexable. The preserved CV experience retains its own prior crawler metadata unless explicitly changed later.

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

GitHub Pages must be enabled once in the repository UI:

`Settings → Pages → Build and deployment → Source: GitHub Actions`

After that, pushes to `main` deploy automatically.
