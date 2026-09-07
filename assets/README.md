# Asset provenance

The **FMB About Me Consultant** folder in Google Drive is the authoritative source of truth for portfolio photography and source media used by this repository.

Repository images may be optimized WebP derivatives, but no shipped photograph may remain if its source has been removed from that Drive folder. When Drive changes, the repository must be reconciled to Drive.

## Current Drive replacement source → destination

| Drive original | Repository asset | Use |
|---|---|---|
| `C2C1B846-0226-47B7-A29D-C7EF12EBAD35.png` | `img/portrait-hero.webp` | Homepage + CV Presence |
| `CB024D51-646A-463D-916D-9A3CA44EEDD1.png` | `img/portrait-close.webp` | CV Professional value |
| `73351DE4-ED4C-4A06-A2AB-E3600B9D735A.png` | `img/talent-stage.webp` | CV Talent portrait candidate |
| `IMG_8167.jpg` | `img/education-graduation.webp` | CV Education |
| `64F14DE6-FFF8-4271-B0A5-24CDD435910D.png` | `img/service-01.webp` | CV Service |
| `79E0C9FA-F08A-42F6-A106-9DB0B58B19AF.png` | `img/service-02.webp` | CV Service |
| `8617711D-2CA7-4892-BD87-9FD6FA2A7A66.png` | `img/service-03.webp` | CV Service |
| `BBFE1445-43B6-46E8-914F-4D85F74576E6.png` | `img/service-04.webp` | CV Service |
| `F2FAB827-A979-4A04-90AB-09EF2FCCC40C.png` | `img/talent-keynote.webp` | CV Talent + Continuing Journey |
| `03D76DA6-CE9B-4F64-823A-137F40E893BF.png` | `img/work-desk.webp` | CV Selected work |
| `9FC22779-0496-412A-AA94-E0B77629F479.png` | `img/work-field.webp` | CV Selected work |
| `A1B4F77E-B428-4BE5-815C-357C515D804F.png` | `img/work-press.webp` | CV Selected work |
| `F6F6197B-5622-46A4-BD3C-ACD133EDD2F6.png` | `img/work-media.webp` | CV Selected work |
| `65922687-A4BB-4C43-BC4A-CE53A917FAE4.png` | `img/wordmark.webp` | CV opening/final identity |
| `September 2, 2026.mp3` | `audio/portfolio-score.mp3` | Optional CV audio |
| `Masinloc_Connect_Case_Study_2026.pdf` | `doc/Masinloc-Connect-Case-Study-2026.pdf` | CV linked case study |

## September 7, 2026 production repair

A production audit found that `portrait-hero.webp` and `portrait-close.webp` on `main` were not valid RIFF/WebP binaries, and that the shipped Talent portrait was only 420×525 while the page declared a much larger presentation size. The three CV portrait assets were restored to the last repository versions that had already passed binary, browser, and responsive validation so the live CV no longer ships broken or placeholder-quality portrait files.

The current Drive HD masters above remain the canonical source for the next controlled visual refresh. The active production fallback blobs are intentionally known-good derivatives: `f3d2d9f8…` for `portrait-hero.webp`, `913f11da…` for `portrait-close.webp`, and `d8aca7fc…` for `talent-stage.webp`. Before any future replacement reaches production, the generated files must pass the repository asset validation gate. This prevents a corrupt conversion from replacing a working production portrait again.

The Drive file previously documented as `IMG_0455.JPG` was not present in the current HD master folders during this audit, so it is no longer listed as the current close-portrait source. `73351DE4-ED4C-4A06-A2AB-E3600B9D735A.png` is a studio portrait rather than a lectern photograph; it is therefore treated as a future portrait candidate, not blindly substituted for the current Talent-stage image.

## Book landing photography — resolved 2026-09-07

`book-hero-portrait.jpg` and `book-cover-art.jpg` shipped as corrupt binaries: neither carried a
JPEG start-of-image marker, so both rendered as broken images on the book landing hero and on the
book card of the root chooser. Both `.jpg` files have been deleted and replaced with WebP
derivatives built from the current Drive masters.

`scripts/validate-site-assets.py` now checks every shipped raster in `assets/img` by magic bytes
rather than by extension. The previous guard only inspected `.webp`, which is why two corrupt
JPEGs reached production unnoticed.

| Drive original | Repository asset | Use |
|---|---|---|
| `EFBADEEE-CB64-495C-980B-7C7845F69AFF.png` | `img/book-hero-portrait.webp` | Book landing hero portrait |
| `A5414859-4370-42DA-B97B-80F6C6324D55.png` | `img/book-cover-art.webp` | Book cover artwork, `og:image` |
| `A5414859-4370-42DA-B97B-80F6C6324D55.png` (rows 710–1270) | `img/book-silk-field.webp` | Page fabric field, coded cover backing, quote band, chooser card 03 |

`book-silk-field.webp` is not a separate photograph. It is the band of the cover artwork that
carries no type — the cover was scanned for dark ink and the only text-free rows are 710 to 1270 —
so the page background and the cover are the same piece of fabric. Re-crop from the same rows if
the cover is ever re-issued.

The chooser card for option 03 uses the fabric plate rather than the cover artwork on purpose. The
cover carries its own title lockup, which collided with the card's overlaid heading and rendered
the words twice.

## Reading app icons

`book/app-icon-*.png` are generated, not photographed: an italic Playfair "R" on
the fabric plate. Regenerate at 512 and downscale; keep the maskable variant's
artwork inside the safe circle so Android does not crop the letter.

## Share cards

Both share cards are generated, not photographed, and both are 1200x630 because
social crops to roughly 1.91:1 — the 4:5 cover artwork lost its title and byline
in shared links.

| Source | Repository asset | Use |
|---|---|---|
| `img/book-silk-field.webp` + the title lockup | `img/book-share-card.jpg` | `og:image` for `/book/` |
| `img/wordmark.webp` on the root palette | `img/fmb-share-card.jpg` | `og:image` for `/` |

Regenerate them by re-rendering at 1200x630 with the same lockup and exporting
JPEG. Keep the content inside roughly the central 80% so no platform crop cuts
the title, the byline, or the wordmark.

## Processing

Photography is converted to WebP without cropping or upscaling. CSS controls framing. Web delivery derivatives may be resized below the source resolution to reduce page weight while preserving the original aspect ratio. The Drive originals remain the source of truth.

The source audio remains the original file and is not re-encoded.
