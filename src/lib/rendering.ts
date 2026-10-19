/**
 * Display-capability analysis: decides which LogMAR levels can be rendered
 * faithfully on the current screen for a given calibration and distance.
 */

import { LOGMAR_LEVELS, optotypeHeightMm } from "./optometry";

/**
 * Minimum stroke width, in physical device pixels, for an optotype to be
 * rendered with recognisable geometry. Below one pixel the 1′ detail of the
 * E collapses into anti-aliasing blur and the level is excluded. At exactly
 * one pixel and up, the E keeps its shape (slightly softened edges only lower
 * contrast, which can make the task marginally harder, never easier). This
 * matters on 2× phone screens, where the 6/6 stroke at 40 cm is ≈1.5 px.
 */
export const MIN_STROKE_DEVICE_PX = 1.0;

/** Crowding bars: gap between optotype and bar, and bar thickness, as fractions of optotype height. */
export const CROWDING_GAP_RATIO = 0.5;
export const CROWDING_BAR_RATIO = 0.2;

/** Total edge length of an optotype including its crowding frame, as a multiple of optotype height. */
export const CROWDED_EXTENT_RATIO = 1 + 2 * (CROWDING_GAP_RATIO + CROWDING_BAR_RATIO);

export interface RenderEnvironment {
  pxPerMm: number;
  devicePixelRatio: number;
  /** Space available for the stimulus, in CSS px. */
  availableWidthPx: number;
  availableHeightPx: number;
}

export interface LevelRenderInfo {
  logMAR: number;
  heightMm: number;
  heightCssPx: number;
  strokeDevicePx: number;
  fits: boolean;
  resolvable: boolean;
}

export function analyseLevels(distanceMm: number, env: RenderEnvironment): LevelRenderInfo[] {
  const maxPx = Math.min(env.availableWidthPx, env.availableHeightPx);
  return LOGMAR_LEVELS.map((logMAR) => {
    const heightMm = optotypeHeightMm(logMAR, distanceMm);
    const heightCssPx = heightMm * env.pxPerMm;
    const strokeDevicePx = (heightCssPx / 5) * env.devicePixelRatio;
    return {
      logMAR,
      heightMm,
      heightCssPx,
      strokeDevicePx,
      fits: heightCssPx <= maxPx,
      resolvable: strokeDevicePx >= MIN_STROKE_DEVICE_PX,
    };
  });
}

/** Contiguous, descending list of levels that both fit on screen and are resolvable. */
export function testableLevels(info: LevelRenderInfo[]): number[] {
  return info.filter((l) => l.fits && l.resolvable).map((l) => l.logMAR);
}

/**
 * Snap the optotype size to whole device pixels when doing so keeps the size
 * error small. When the 1′ stroke unit lands on whole device pixels every edge
 * of the E is pixel-aligned (perfectly crisp); otherwise we keep the exact
 * geometric size and accept anti-aliased edges, because accuracy wins.
 *
 * Returns the size in CSS px to render.
 */
export function snapOptotypeSize(
  heightCssPx: number,
  devicePixelRatio: number,
  maxRelativeError = 0.025,
): { sizeCssPx: number; pixelAligned: boolean } {
  const unitDevice = (heightCssPx / 5) * devicePixelRatio;
  const snappedUnit = Math.round(unitDevice);
  if (snappedUnit >= 1) {
    const snappedCss = (snappedUnit * 5) / devicePixelRatio;
    if (Math.abs(snappedCss - heightCssPx) / heightCssPx <= maxRelativeError) {
      return { sizeCssPx: snappedCss, pixelAligned: true };
    }
  }
  return { sizeCssPx: heightCssPx, pixelAligned: false };
}

/** Hand-held / desk viewing distances the app may ask for, nearest first. */
export const NEAR_DISTANCES_MM = [400, 600, 800] as const;

/** Smallest stroke (device px) of a level at a distance on this screen. */
function strokeDevicePx(logMAR: number, distanceMm: number, pxPerMm: number, dpr: number): number {
  return ((optotypeHeightMm(logMAR, distanceMm) * pxPerMm) / 5) * dpr;
}

/**
 * Pick the nearest viewing distance at which this screen can still draw the
 * small levels sharply. Coarse screens (e.g. a 1× computer monitor) cannot
 * draw a 6/6 E at 40 cm, so the user is moved back instead: the optotype then
 * gets physically larger and spans more pixels for the same visual angle.
 * Prefers a distance reaching −0.1 LogMAR, then one reaching 0.0.
 */
export function chooseNearDistance(pxPerMm: number, devicePixelRatio: number): number {
  for (const target of [-0.1, 0]) {
    const d = NEAR_DISTANCES_MM.find(
      (mm) => strokeDevicePx(target, mm, pxPerMm, devicePixelRatio) >= MIN_STROKE_DEVICE_PX,
    );
    if (d !== undefined) return d;
  }
  return NEAR_DISTANCES_MM[NEAR_DISTANCES_MM.length - 1];
}
