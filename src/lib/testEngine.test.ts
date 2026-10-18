import { describe, expect, it } from "vitest";
import { LOGMAR_LEVELS } from "./optometry";
import {
  type Answer,
  type EngineConfig,
  type EngineState,
  answer,
  createEngine,
  randomDirection,
  scoreEngine,
} from "./testEngine";

const config: EngineConfig = { levels: LOGMAR_LEVELS, trialsPerLine: 5, passThreshold: 3 };

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/**
 * Simulated observer: answers correctly for levels >= threshold, otherwise "unsure",
 * except for `guessCorrectBelow` lucky guesses on full lines below threshold.
 */
function run(threshold: number, cfg = config, guessCorrectBelow = 0): EngineState {
  const rand = seeded(42);
  let state = createEngine(cfg, rand);
  let guard = 0;
  let below = 0;
  while (state.phase !== "done" && guard++ < 500) {
    const level = cfg.levels[state.levelIndex];
    let a: Answer;
    if (level >= threshold - 1e-9) a = state.direction;
    else if (state.phase === "full" && below < guessCorrectBelow) {
      below++;
      a = state.direction;
    } else a = "unsure";
    state = answer(state, a, cfg, rand);
  }
  return state;
}

describe("randomDirection", () => {
  it("never repeats the previous direction", () => {
    const rand = seeded(1);
    let prev = randomDirection(rand);
    for (let i = 0; i < 500; i++) {
      const next = randomDirection(rand, prev);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });
});

describe("engine", () => {
  it.each([1.0, 0.5, 0.3, 0.0, -0.1])("perfect observer with threshold %s scores exactly", (t) => {
    const s = scoreEngine(run(t), config);
    expect(s.logMAR).toBeCloseTo(t, 5);
  });

  it("perfect at the smallest level is flagged as better than range", () => {
    const s = scoreEngine(run(-0.2), config);
    expect(s.logMAR).toBeCloseTo(-0.2, 5);
    expect(s.betterThanRange).toBe(true);
  });

  it("cannot read anything → worse than range", () => {
    const s = scoreEngine(run(5), config);
    expect(s.worseThanRange).toBe(true);
    expect(s.logMAR).toBeGreaterThan(1.0);
  });

  it("credits partial lines letter-by-letter", () => {
    // Threshold 0.2, plus 2 lucky guesses below threshold.
    const s = scoreEngine(run(0.2, config, 2), config);
    expect(s.logMAR).toBeLessThan(0.2);
    expect(s.logMAR).toBeGreaterThanOrEqual(0.1 - 1e-9);
  });

  it("steps up when the first full line fails", () => {
    const cfg: EngineConfig = { levels: [0.3, 0.2, 0.1, 0.0], trialsPerLine: 5, passThreshold: 3 };
    const s = scoreEngine(run(0.3, cfg), cfg);
    expect(s.logMAR).toBeCloseTo(0.3, 5);
  });

  it("respects a reduced level range", () => {
    const cfg: EngineConfig = { levels: [0.5, 0.4, 0.3, 0.2, 0.1], trialsPerLine: 5, passThreshold: 3 };
    const s = scoreEngine(run(-0.2, cfg), cfg);
    expect(s.logMAR).toBeCloseTo(0.1, 5);
    expect(s.betterThanRange).toBe(true);
  });
});
