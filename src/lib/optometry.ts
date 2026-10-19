/**
 * Core optometric mathematics.
 *
 * Conventions
 * - A 0.0 LogMAR (6/6, 20/20, decimal 1.0) optotype subtends 5 minutes of arc
 *   at the viewing distance; its stroke / gap detail subtends 1 minute of arc.
 * - Each 0.1 LogMAR step scales optotype size by 10^0.1 (≈ 1.2589).
 */

/** Standard ISO/IEC 7810 ID-1 card (credit card) dimensions, in millimetres. */
export const ID1_CARD = {
  widthMm: 85.6,
  heightMm: 53.98,
  cornerRadiusMm: 3.18,
} as const;

/** Minutes of arc subtended by the full height of a 0.0 LogMAR optotype. */
export const BASE_OPTOTYPE_ARCMIN = 5;

export const LOGMAR_MAX = 1.0;
export const LOGMAR_MIN = -0.2;
export const LOGMAR_STEP = 0.1;

export type TestMode = "distance" | "near";

/** Tests closer than 1 m measure near acuity (accommodation is involved), not distance acuity. */
export function modeForDistance(distanceMm: number): TestMode {
  return distanceMm < 1000 ? "near" : "distance";
}

export interface DistanceLabel {
  mode: TestMode;
  metricLabel: string;
  imperialLabel: string;
}

export function describeDistance(distanceMm: number): DistanceLabel {
  const metricLabel = distanceMm >= 1000 ? `${distanceMm / 1000} m` : `${distanceMm / 10} cm`;
  const inches = distanceMm / 25.4;
  const imperialLabel = inches >= 60 ? `${Math.round(inches / 12)} feet` : `${Math.round(inches)} inches`;
  return { mode: modeForDistance(distanceMm), metricLabel, imperialLabel };
}

/** Round to a fixed number of decimals, avoiding binary float noise (e.g. 0.30000000000000004). */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** All LogMAR chart levels from largest (+1.0) to smallest (-0.2). */
export const LOGMAR_LEVELS: readonly number[] = (() => {
  const levels: number[] = [];
  const count = Math.round((LOGMAR_MAX - LOGMAR_MIN) / LOGMAR_STEP);
  for (let i = 0; i <= count; i++) {
    levels.push(roundTo(LOGMAR_MAX - i * LOGMAR_STEP, 1));
  }
  return levels;
})();

const ARCMIN_TO_RAD = Math.PI / (180 * 60);

/**
 * Height (mm) of a 0.0 LogMAR optotype at distance `distanceMm`:
 *   H = 2 · d · tan(5′ / 2)
 */
export function baseOptotypeHeightMm(distanceMm: number): number {
  return 2 * distanceMm * Math.tan((BASE_OPTOTYPE_ARCMIN / 2) * ARCMIN_TO_RAD);
}

/** Minimum angle of resolution (arc minutes) for a LogMAR value. */
export function marFromLogMAR(logMAR: number): number {
  return 10 ** logMAR;
}

/** Optotype height (mm) for a LogMAR level at the given viewing distance. */
export function optotypeHeightMm(logMAR: number, distanceMm: number): number {
  return baseOptotypeHeightMm(distanceMm) * marFromLogMAR(logMAR);
}

/** Convert a physical size in mm into CSS pixels using a calibrated pixels-per-mm ratio. */
export function mmToCssPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

/**
 * M-units (Sloan): the distance in metres at which the optotype subtends 5′.
 * At viewing distance d, a LogMAR score corresponds to d(m) × 10^LogMAR M,
 * e.g. 0.0 LogMAR at 40 cm = 0.4M ("0.4/0.4M").
 */
export function mUnits(logMAR: number, distanceMm: number): number {
  return (distanceMm / 1000) * marFromLogMAR(logMAR);
}

export interface AcuityNotation {
  logMAR: number;
  decimal: number;
  /** Snellen metric fraction "6/x". */
  snellenMetric: string;
  snellenMetricDenominator: number;
  /** Snellen imperial fraction "20/x". */
  snellenImperial: string;
  snellenImperialDenominator: number;
}

/** Express a LogMAR score in all standard clinical notations. */
export function toNotations(logMAR: number): AcuityNotation {
  const mar = marFromLogMAR(logMAR);
  const metricDen = roundTo(6 * mar, 1);
  const imperialDen = Math.round(20 * mar);
  return {
    logMAR: roundTo(logMAR, 2),
    decimal: roundTo(1 / mar, 2),
    snellenMetric: `6/${formatDenominator(metricDen)}`,
    snellenMetricDenominator: metricDen,
    snellenImperial: `20/${imperialDen}`,
    snellenImperialDenominator: imperialDen,
  };
}

function formatDenominator(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Format a LogMAR value with an explicit sign, e.g. "+0.30", "0.00", "-0.10". */
export function formatLogMAR(logMAR: number): string {
  const v = roundTo(logMAR, 2);
  if (v === 0) return "0.00";
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
}
