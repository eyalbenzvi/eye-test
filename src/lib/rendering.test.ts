import { describe, expect, it } from "vitest";
import { analyseLevels, chooseNearDistance, snapOptotypeSize, testableLevels } from "./rendering";

describe("rendering analysis", () => {
  it("excludes levels that do not fit or cannot be resolved", () => {
    const info = analyseLevels(3000, {
      pxPerMm: 3.78,
      devicePixelRatio: 1,
      availableWidthPx: 120,
      availableHeightPx: 400,
    });
    const levels = testableLevels(info);
    // 1.0 LogMAR at 3 m = 43.6 mm = 165 px, does not fit in 120 px.
    expect(levels[0]).toBeLessThan(1);
    expect(levels.at(-1)).toBe(-0.2);
  });

  it("snaps to whole device pixels only within tolerance", () => {
    const a = snapOptotypeSize(50.2, 2);
    expect(a.pixelAligned).toBe(true);
    expect(a.sizeCssPx).toBe(50);
    const b = snapOptotypeSize(11, 1); // unit 2.2 → 2 = 9% error
    expect(b.pixelAligned).toBe(false);
    expect(b.sizeCssPx).toBe(11);
  });
});

describe("phone near-test range", () => {
  // 2× iPhone (163 CSS ppi) at 40 cm: the 6/6 stroke is ≈1.5 device px and must stay testable.
  it("includes 6/6 and better on a 2× phone at 40 cm", () => {
    const levels = testableLevels(
      analyseLevels(400, { pxPerMm: 163 / 25.4, devicePixelRatio: 2, availableWidthPx: 300, availableHeightPx: 300 }),
    );
    expect(levels).toContain(0);
    expect(levels.at(-1)).toBeLessThanOrEqual(-0.1);
  });
});

describe("viewing distance choice", () => {
  it("keeps phones at 40 cm", () => {
    expect(chooseNearDistance(153 / 25.4, 3)).toBe(400);
    expect(chooseNearDistance(163 / 25.4, 2)).toBe(400);
    expect(chooseNearDistance(148 / 25.4, 2.25)).toBe(400);
  });

  it("moves a 1x computer screen back far enough to draw 6/6", () => {
    const pxPerMm = 110 / 25.4;
    const d = chooseNearDistance(pxPerMm, 1);
    expect(d).toBeGreaterThan(400);
    const levels = testableLevels(
      analyseLevels(d, { pxPerMm, devicePixelRatio: 1, availableWidthPx: 1000, availableHeightPx: 600 }),
    );
    expect(levels).toContain(0);
  });
});

describe("coarse monitors", () => {
  it("moves a coarse ~0.3 mm-pixel monitor beyond 1 m", () => {
    // 4.33 CSS px/mm at 75% zoom (dpr 0.75) = 3.25 physical px/mm.
    const d = chooseNearDistance(4.33, 0.75);
    expect(d).toBeGreaterThan(1000);
    const levels = testableLevels(
      analyseLevels(d, { pxPerMm: 4.33, devicePixelRatio: 0.75, availableWidthPx: 1400, availableHeightPx: 700 }),
    );
    expect(levels).toContain(0);
  });
});
