# AcuityCheck — distance visual acuity self-screening

A Next.js (App Router) + TypeScript + Tailwind CSS web app for calibrated, at-home distance visual acuity
self-screening with a Tumbling E chart. It gives an indicative LogMAR / Snellen / decimal score for each eye.

> This tool is for self-screening purposes only and does not replace a professional examination by a licensed
> optometrist or ophthalmologist.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests for the optics math, test engine and rendering limits
npm run typecheck && npm run lint && npm run build
```

## Flow

| Route        | Step                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| `/`          | Welcome, purpose, mandatory disclaimer acknowledgement                                       |
| `/calibrate` | Match an on-screen ISO/IEC 7810 ID-1 card (85.6 × 53.98 mm) → pixels-per-mm; optional 50 mm ruler check |
| `/setup`     | Distance (2 m / 6.5 ft or 3 m / 10 ft), crowding bars, measurable-range preview               |
| `/checklist` | Lighting, max brightness, filters off, no glare, distance measured, correction, controls      |
| `/test`      | Right eye → rest → left eye; on-screen pad or keyboard (arrows, Space = unsure, Esc = pause)   |
| `/results`   | Per-eye scores in all notations, insights, interocular alert, guidance, print / save as PDF   |

## How accuracy is achieved

- **Optics** (`src/lib/optometry.ts`): a 0.0 LogMAR optotype subtends 5′, so `H = 2·d·tan(2.5′)`; each level is
  `H · 10^LogMAR`, from +1.0 to −0.2 in 0.1 steps. The E is drawn on a 5×5 grid so its stroke subtends exactly 1′.
- **Calibration**: all sizes are `mm × pxPerMm`, where `pxPerMm` comes from the card match and is stored (with the
  device pixel ratio and screen size) in global state persisted to `localStorage`. A zoom or display change is
  detected and triggers a recalibration prompt.
- **Rendering limits** (`src/lib/rendering.ts`): levels that do not fit the stimulus area, or whose 1′ stroke would
  be under 1.5 physical device pixels, are excluded. Sizes are snapped to whole device pixels (and the element
  aligned to the device grid) only when that changes the size by ≤ 2.5%; otherwise exact geometry wins.
- **No motion**: optotypes are crisp SVG paths, `#000` on `#FFF`, swapped instantly with no transitions.

## Test protocol (`src/lib/testEngine.ts`)

1. **Screening** — one optotype per level from the largest down; the first miss marks the approximate threshold.
2. **Full lines** — 5 optotypes per level starting 0.2 LogMAR above the miss. ≥ 3/5 passes and steps down; a fail
   steps up. Stops when a failed line sits under a passed one (or at the range limits).
3. **Scoring** — ETDRS-style letter-by-letter: `LogMAR = (largest full line + 0.1) − 0.02 × correct`. Scores at
   the edge of the measurable range are reported with ≥ / ≤ qualifiers.

Directions are drawn with `crypto.getRandomValues` and never repeat consecutively. Inputs within 250 ms of the
previous answer are ignored to absorb key bounce from remotes.

## Interpretation (`src/lib/insights.ts`)

Severity bands loosely follow WHO distance-vision categories; any eye worse than 0.0 LogMAR flags possible
refractive error (myopia / astigmatism); a ≥ 0.2 LogMAR (two-line) difference between eyes raises an interocular
discrepancy alert; both eyes worse than 6/12 adds a driving caution.
