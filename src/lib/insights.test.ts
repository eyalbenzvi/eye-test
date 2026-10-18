import { describe, expect, it } from "vitest";
import { classify, interocular, recommend } from "./insights";
import type { EyeScore } from "./testEngine";

const score = (logMAR: number): EyeScore => ({
  logMAR,
  worseThanRange: false,
  betterThanRange: false,
  largestLevel: 1,
  smallestLevel: -0.2,
  lines: [],
  totalCorrect: 0,
  totalPresented: 0,
});

describe("insights", () => {
  it("classifies by LogMAR band", () => {
    expect(classify(score(0)).severity).toBe("normal");
    expect(classify(score(0.2)).severity).toBe("borderline");
    expect(classify(score(0.3)).severity).toBe("mild");
    expect(classify(score(0.4)).severity).toBe("moderate");
    expect(classify(score(0.7)).severity).toBe("severe");
  });

  it("flags a two-line interocular difference", () => {
    const io = interocular(score(0.3), score(0.1));
    expect(io.level).toBe("significant");
    expect(io.weakerEye).toBe("right");
    expect(interocular(score(0.1), score(0)).level).toBe("minor");
  });

  it("distance mode mentions myopia and driving; near mode mentions presbyopia instead", () => {
    const dist = recommend(score(0.4), score(0.4), "distance").points.join(" ");
    expect(dist).toMatch(/myopia/);
    expect(dist).toMatch(/driving/);
    const near = recommend(score(0.4), score(0.4), "near").points.join(" ");
    expect(near).toMatch(/presbyopia/);
    expect(near).not.toMatch(/driving/);
    expect(near).toMatch(/cannot detect nearsightedness/);
  });

  it("near mode with normal results stays routine", () => {
    const r = recommend(score(0), score(-0.1), "near");
    expect(r.urgency).toBe("routine");
    expect(r.points[0]).toMatch(/normal range/);
  });
});
