/**
 * Clinical-style interpretation of acuity scores. Categories loosely follow
 * the WHO ICD-11 distance vision impairment bands (mild: worse than 6/12,
 * moderate: worse than 6/18, severe: worse than 6/60).
 */

import { roundTo } from "./optometry";
import type { EyeScore } from "./testEngine";

export type Severity = "normal" | "borderline" | "mild" | "moderate" | "severe";

export interface Classification {
  severity: Severity;
  label: string;
  description: string;
}

export function classify(score: EyeScore): Classification {
  const v = score.logMAR;
  if (score.worseThanRange || v > 1.0) {
    return {
      severity: "severe",
      label: "Severely reduced",
      description: "Could not reliably identify the largest symbols. This warrants prompt professional assessment.",
    };
  }
  if (v <= 0.0) {
    return {
      severity: "normal",
      label: "Normal",
      description: "Meets or exceeds the standard reference of 6/6 (20/20) acuity.",
    };
  }
  if (v <= 0.2) {
    return {
      severity: "borderline",
      label: "Slightly below standard",
      description: "Slightly below 6/6. Often due to a small uncorrected refractive error.",
    };
  }
  if (v <= 0.3) {
    return {
      severity: "mild",
      label: "Reduced",
      description: "Noticeably below 6/6, around the 6/12 level used by many driving standards.",
    };
  }
  if (v <= 0.5) {
    return {
      severity: "moderate",
      label: "Mild impairment range",
      description: "Worse than 6/12. Daily tasks such as driving or reading signs may be affected.",
    };
  }
  return {
    severity: "severe",
    label: "Moderate to severe impairment range",
    description: "Substantially reduced distance acuity. Please arrange a professional eye examination soon.",
  };
}

export type InterocularLevel = "none" | "minor" | "significant";

export interface InterocularResult {
  difference: number;
  level: InterocularLevel;
  weakerEye: "right" | "left" | null;
}

/** A difference of two lines (0.2 LogMAR) or more between eyes is clinically significant. */
export const INTEROCULAR_SIGNIFICANT = 0.2;
export const INTEROCULAR_MINOR = 0.1;

export function interocular(right: EyeScore, left: EyeScore): InterocularResult {
  const difference = roundTo(Math.abs(right.logMAR - left.logMAR), 2);
  const weakerEye = right.logMAR === left.logMAR ? null : right.logMAR > left.logMAR ? "right" : "left";
  const level: InterocularLevel =
    difference >= INTEROCULAR_SIGNIFICANT - 1e-9
      ? "significant"
      : difference >= INTEROCULAR_MINOR - 1e-9
        ? "minor"
        : "none";
  return { difference, level, weakerEye };
}

export type Urgency = "routine" | "recommended" | "prompt";

export interface Recommendation {
  urgency: Urgency;
  headline: string;
  points: string[];
}

export function recommend(right: EyeScore, left: EyeScore): Recommendation {
  const r = classify(right);
  const l = classify(left);
  const io = interocular(right, left);
  const severities = [r.severity, l.severity];
  const points: string[] = [];

  if (severities.includes("severe") || severities.includes("moderate")) {
    points.push("Book a comprehensive eye examination with an optometrist or ophthalmologist as soon as practical.");
  }
  if (severities.some((s) => s !== "normal")) {
    points.push(
      "Reduced distance acuity is most often caused by refractive error (myopia/nearsightedness or astigmatism) that glasses or contact lenses can correct, but it can also signal other eye conditions.",
    );
    points.push("If you already wear glasses or contacts, your prescription may need updating.");
  }
  if (io.level === "significant") {
    points.push(
      `There is a ${io.difference.toFixed(2)} LogMAR (≈${Math.round(io.difference * 10)}-line) difference between your eyes. Asymmetric vision should be checked by a professional, even if your better eye sees well.`,
    );
  }
  if (Math.min(right.logMAR, left.logMAR) > 0.3) {
    points.push(
      "Both eyes scored below 6/12 (20/40), the minimum binocular standard for driving in many regions. Avoid driving until you have been examined.",
    );
  }
  if (points.length === 0) {
    points.push("Your results are within the normal range for both eyes.");
    points.push("Continue routine comprehensive eye examinations (typically every 1–2 years, or as advised).");
  }

  let urgency: Urgency = "routine";
  if (severities.includes("severe") || severities.includes("moderate")) urgency = "prompt";
  else if (severities.some((s) => s !== "normal") || io.level === "significant") urgency = "recommended";

  const headline = {
    routine: "No concerns detected on this screening",
    recommended: "A professional eye examination is recommended",
    prompt: "Please arrange a professional eye examination soon",
  }[urgency];

  return { urgency, headline, points };
}

export const URGENT_SYMPTOMS = [
  "Sudden loss or dimming of vision in one or both eyes",
  "New flashes of light, a shower of floaters, or a curtain/shadow over your vision",
  "Eye pain, marked redness, or sudden double vision",
] as const;
