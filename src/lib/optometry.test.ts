import { describe, expect, it } from "vitest";
import {
  LOGMAR_LEVELS,
  baseOptotypeHeightMm,
  formatLogMAR,
  modeForDistance,
  mUnits,
  optotypeHeightMm,
  toNotations,
} from "./optometry";

describe("optotype geometry", () => {
  it("0.0 LogMAR optotype subtends 5 arcmin", () => {
    // 6 m reference: the classic 8.73 mm 6/6 letter.
    expect(baseOptotypeHeightMm(6000)).toBeCloseTo(8.727, 3);
    expect(baseOptotypeHeightMm(3000)).toBeCloseTo(4.363, 3);
    expect(baseOptotypeHeightMm(2000)).toBeCloseTo(2.909, 3);
  });

  it("scales by 10^LogMAR", () => {
    const base = baseOptotypeHeightMm(3000);
    expect(optotypeHeightMm(1.0, 3000)).toBeCloseTo(base * 10, 6);
    expect(optotypeHeightMm(0.3, 3000)).toBeCloseTo(base * 1.99526, 4);
    expect(optotypeHeightMm(-0.2, 3000) / optotypeHeightMm(-0.1, 3000)).toBeCloseTo(10 ** -0.1, 9);
  });

  it("defines 13 levels from +1.0 to -0.2", () => {
    expect(LOGMAR_LEVELS).toHaveLength(13);
    expect(LOGMAR_LEVELS[0]).toBe(1);
    expect(LOGMAR_LEVELS[12]).toBe(-0.2);
    expect(LOGMAR_LEVELS).toContain(0.3);
  });
});

describe("notations", () => {
  it.each([
    [0, 1, "6/6", "20/20"],
    [0.3, 0.5, "6/12", "20/40"],
    [0.6, 0.25, "6/23.9", "20/80"],
    [1, 0.1, "6/60", "20/200"],
    [-0.1, 1.26, "6/4.8", "20/16"],
  ])("LogMAR %s", (logMAR, decimal, metric, imperial) => {
    const n = toNotations(logMAR);
    expect(n.decimal).toBe(decimal);
    expect(n.snellenMetric).toBe(metric);
    expect(n.snellenImperial).toBe(imperial);
  });

  it("formats signed LogMAR", () => {
    expect(formatLogMAR(0)).toBe("0.00");
    expect(formatLogMAR(0.3)).toBe("+0.30");
    expect(formatLogMAR(-0.1)).toBe("−0.10");
  });
});

describe("near testing", () => {
  it("0.0 LogMAR at 40 cm is 0.582 mm and 0.4M", () => {
    expect(baseOptotypeHeightMm(400)).toBeCloseTo(0.5818, 4);
    expect(mUnits(0, 400)).toBeCloseTo(0.4, 9);
    expect(mUnits(0.3, 400)).toBeCloseTo(0.798, 3);
    // 1M is defined as 5′ at 1 m = 1.454 mm.
    expect(baseOptotypeHeightMm(1000)).toBeCloseTo(1.454, 3);
  });

  it("classifies distances into modes", () => {
    expect(modeForDistance(400)).toBe("near");
    expect(modeForDistance(300)).toBe("near");
    expect(modeForDistance(1250)).toBe("near");
    expect(modeForDistance(2000)).toBe("distance");
  });
});
