# Francine Marie Bautista — Official Website

Canonical source for `francinemariebautista.com`, the full CV experience, consultation intake, and professional homepage.

## Hard production boundary

- Main website repository: `masinlocandher-max/PCO`
- Main website host: GitHub Pages
- Canonical domain: `https://francinemariebautista.com`
- News repository: `masinlocandher-max/FMBNews`
- News route: `https://www.francinemariebautista.com/news/`
- News delivery: Cloudflare Worker `fmb-news` on `/news*`
- Vercel production role: none
- Forbidden production source: `masinlocandher-max/FMB-Ecosystem`

PCO owns the root website. FMBNews owns `/news*`. PCO must not copy, proxy, rewrite, build, or embed FMBNews into its GitHub Pages deployment. Cloudflare routes `/news*` directly to the FMBNews Worker. Vercel and FMB-Ecosystem must not own, source, proxy, redirect, or deploy `francinemariebautista.com`, `www.francinemariebautista.com`, or `/news/`.

## Image quality policy

High-resolution originals and newly approved masters are preserved in Google Drive. The production website should use high-resolution, web-optimized derivatives sourced from those masters rather than tiny placeholder exports or multi-megabyte raw originals. This preserves visible detail while keeping the one-page CV responsive.
