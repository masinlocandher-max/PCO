# Asset provenance

Every image, the audio and the case study in this folder came from the
**FMB About Me Consultant** folder in Google Drive. Nothing here is stock,
generated, or substituted.

## Source → destination

| Drive original | In this repo | Used for |
|---|---|---|
| `IMG_0418.JPG` | `img/portrait-hero.webp` | Chapter 01 Presence |
| `IMG_0417.JPG` | `img/portrait-close.webp` | Chapter 06 Professional value |
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

## Removed 2 Sept 2026

Three portraits were deleted from the Drive folder and have been deleted
from this repo to match — the folder is the source of truth:

| Drive original | Was | Status |
|---|---|---|
| `049EECDA-…png` | `img/portrait-hero.webp` | replaced by `F5D6A52E-…png` |
| `IMG_9443.jpg` | `img/portrait-seated.webp` | replaced by `B8431C06-…png` |
| `IMG_7778.jpg` | `img/portrait-alt.webp` | deleted, was unused |

The Professional value frame changed from 16:9 to 4:5 because the new
portrait is a vertical crop — reshaping the frame rather than cropping
the subject out of it.

## Updated 2 Sept 2026

Four further portraits from the same terno session were added to the
folder. Nothing was removed there, so nothing was removed here — the two
strongest were swapped into the two portrait slots:

| Drive original | Now | Replaces |
|---|---|---|
| `IMG_0418.JPG` | `img/portrait-hero.webp` | (latest in the folder) |
| `IMG_0417.JPG` | `img/portrait-close.webp` | (second latest) |

Earlier terno frames (`471AAC07`, `C9F5292E`, `F5D6A52E`, `B8431C06`,
`E92AD5AB`, `C622E06A`) remain in Drive as the archive and are not shipped.

These two are JPEG sources rather than PNG, so they were encoded at
WebP q88 instead of q82 — a low setting compounds existing JPEG artifacts.
Both still land under their source file size. They are also 922x1152
rather than 1122x1402; same 4:5 ratio, so nothing in the layout moves, and
922px still covers the hero slot at 2x on a 1440px viewport.

The remaining four (`F5D6A52E`, `B8431C06`, `E92AD5AB`, `C622E06A`) stay
in Drive as the archive and are deliberately not shipped. The page has two
portrait slots; adding a third and fourth frame of the same outfit would
repeat one card template rather than give each photograph its own
treatment.

Every image now in `img/` is referenced by the page. There are no orphans.

## Processing

Images were converted to WebP at quality 82 with no cropping — aspect
ratios are untouched and framing is handled in CSS, so any image can be
re-placed without re-exporting. Nothing was upscaled; anything over
1800px on the long edge was reduced to 1800px.

**37.0 MB of PNG/JPG became 1.3 MB of WebP.** That matters: this page is a
first impression, often opened on a phone on mobile data.

The audio is the **original file, byte for byte**. It was not re-encoded,
trimmed, normalised, or replaced.

## About the audio

`September 2, 2026.mp3` is 3 min 16 s: **a voiceover mixed with a music
bed at roughly 128 BPM.**

An earlier note in this file claimed the track was music only. That was
wrong, and it was wrong because the measurement was too blunt. Across the
full band the music dominates every statistic — a 6.4 dB loudness range,
only three pauses longer than 0.6 s, a sharp 2.13 Hz envelope peak, and a
spectrum weighted to 50-150 Hz. Those numbers describe the bed, not the
whole recording, and speech mixed under a bed produces exactly that
signature because the music fills the pauses.

Band-limiting the analysis shows the voice clearly:

| Band | Dominant modulation | Syllable-to-beat energy |
|---|---|---|
| 20-200 Hz (kick, bass) | 2.13 Hz — the beat | 0.45 |
| 300-3400 Hz (speech) | **3.04 Hz — syllables** | 0.77 |
| 3400-8000 Hz (sibilance) | 2.02 / 3.16 Hz | 0.66 |

In the speech band the beat peak drops out and a 3 Hz modulation takes
over, which is the rate of deliberate, paced narration. Pitch tracking
over voiced frames gives a 220 Hz median with an 884-cent spread — more
than seven semitones of continuous glide. A sung melody or an instrumental
line lands on discrete scale steps; that spread is speech intonation.

The page treats the recording as atmosphere and narrative spine, never as
a source of information. Nothing on the page depends on hearing it, and
the silent version remains a complete portfolio. The file ships as the
original, byte for byte.
