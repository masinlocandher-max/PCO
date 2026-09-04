# Asset provenance

The **FMB About Me Consultant** folder in Google Drive is the authoritative source of truth for portfolio photography and source media used by this repository.

Repository images may be optimized WebP derivatives, but no shipped photograph may remain if its source has been removed from that Drive folder. When Drive changes, the repository must be reconciled to Drive.

## Current source → destination

| Drive original | Repository asset | Use |
|---|---|---|
| `C2C1B846-0226-47B7-A29D-C7EF12EBAD35.png` | `img/portrait-hero.webp` | Homepage + CV Presence |
| `IMG_0455.JPG` | `img/portrait-close.webp` | CV Professional value |
| `73351DE4-ED4C-4A06-A2AB-E3600B9D735A.png` | `img/talent-stage.webp` | CV Talent portrait |
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

## September 4, 2026 reconciliation

Drive removed the previous sources for the shipped hero, close portrait and tall Talent photograph. Those repository image contents were replaced with current Drive sources above. The old photographs are no longer shipped.

The three replacement portraits were re-encoded as web-optimized derivatives after binary validation. The committed files must identify as RIFF WebP assets before release.

## Processing

Photography is converted to WebP without cropping or upscaling. CSS controls framing. Web delivery derivatives may be resized below the source resolution to reduce page weight while preserving the original aspect ratio. The Drive originals remain the source of truth.

The source audio remains the original file and is not re-encoded.
