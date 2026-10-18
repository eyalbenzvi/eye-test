import { describe, expect, it } from "vitest";
import { classifyDevice, estimateScale } from "./calibration";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const PIXEL = "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";

describe("screen scale estimate", () => {
  it("classifies devices", () => {
    const base = { devicePixelRatio: 3, screenShortSide: 390, coarsePointer: true };
    expect(classifyDevice({ ...base, userAgent: IPHONE })).toBe("iphone");
    expect(classifyDevice({ ...base, userAgent: PIXEL })).toBe("android-phone");
    expect(classifyDevice({ ...base, screenShortSide: 820, userAgent: IPAD })).toBe("tablet");
    expect(classifyDevice({ devicePixelRatio: 2, screenShortSide: 900, coarsePointer: false, userAgent: MAC })).toBe(
      "computer",
    );
  });

  it("estimates iPhone 15 (393 CSS px over 64.6 mm of panel) within 4%", () => {
    const est = estimateScale({ userAgent: IPHONE, devicePixelRatio: 3, screenShortSide: 393, coarsePointer: true });
    // Real value: 1179 px / 460 ppi = 2.563 in = 65.1 mm for 393 CSS px → 6.04 px/mm.
    expect(Math.abs(est.pxPerMm - 6.04) / 6.04).toBeLessThan(0.04);
    expect(est.typicalError).toBeLessThanOrEqual(0.05);
  });

  it("estimates 2x iPhones (326 ppi) at 163 CSS ppi", () => {
    const est = estimateScale({ userAgent: IPHONE, devicePixelRatio: 2, screenShortSide: 375, coarsePointer: true });
    expect(est.pxPerMm * 25.4).toBeCloseTo(163, 5);
  });
});
