# Asset provenance

Every image, the audio and the case study in this folder came from the
**FMB About Me Consultant** folder in Google Drive. Nothing here is stock,
generated, or substituted.

## Source → destination

| Drive original | In this repo | Used for |
|---|---|---|
| `049EECDA-…png` | `img/portrait-hero.webp` | Chapter 01 Presence |
| `IMG_7778.jpg` | `img/portrait-alt.webp` | held in reserve |
| `IMG_9443.jpg` | `img/portrait-seated.webp` | Chapter 06 Professional value |
| `IMG_8167.jpg` | `img/education-graduation.webp` | Chapter 02 Education |
| `64F14DE6-…png` | `img/service-01.webp` | Chapter 03 Service |
| `79E0C9FA-…png` | `img/service-02.webp` | Chapter 03 Service |
| `8617711D-…png` | `img/service-03.webp` | Chapter 03 Service |
| `BBFE1445-…png` | `img/service-04.webp` | Chapter 03 Service |
| `44C87DD7-…png` | `img/talent-stage.webp` | Chapter 04 Talent |
| `F2FAB827-…png` | `img/talent-keynote.webp` | Chapter 04 + Chapter 07 |
| `03D76DA6-…png` | `img/work-desk.webp` | Chapter 05 Selected work |
| `9FC22779-…png` | `img/work-field.webp` | Chapter 05 Selected work |
| `A1B4F77E-…png` | `img/work-press.webp` | Chapter 05 Selected work |
| `F6F6197B-…png` | `img/work-media.webp` | Chapter 05 Selected work |
| `65922687-…png` | `img/wordmark.webp` | Opening frame + Chapter 09 |
| `September 2, 2026.mp3` | `audio/portfolio-score.mp3` | Optional audio experience |
| `Masinloc_Connect_Case_Study_2026.pdf` | `doc/…pdf` | Linked from Chapter 05 |

## Processing

Images were converted to WebP at quality 82 with no cropping — aspect
ratios are untouched and framing is handled in CSS, so any image can be
re-placed without re-exporting. Nothing was upscaled; anything over
1800px on the long edge was reduced to 1800px.

**37.0 MB of PNG/JPG became 1.3 MB of WebP.** That matters: this page is a
first impression, often opened on a phone on mobile data.

The audio is the **original file, byte for byte**. It was not re-encoded,
trimmed, normalised, or replaced.

## One thing to know about the audio

`September 2, 2026.mp3` is 3 min 16 s. Measured, it behaves like a
**music bed, not spoken narration**: its loudness sits in a 6.4 dB band
(speech normally spans 20–40 dB), it contains only three pauses longer
than 0.6 s in the whole runtime, its energy envelope peaks sharply at
2.13 Hz — 128 BPM — and its spectrum is dominated by the 50–150 Hz bass
region rather than the 150–1000 Hz range where speech lives.

The page is built so this does not matter: the audio is treated as
atmosphere, the written content carries all the information, and the
silent version is a complete portfolio. But if a spoken voiceover was
supposed to be in this folder, it is not the file that is here.
