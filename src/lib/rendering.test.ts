import { describe, expect, it } from "vitest";
import { analyseLevels, snapOptotypeSize, testableLevels } from "./rendering";

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
