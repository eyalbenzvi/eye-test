/**
 * Pure, framework-agnostic visual acuity test engine.
 *
 * Protocol (per eye)
 * 1. Screening: one optotype per level, descending from the largest level.
 *    The first miss (or "unsure") marks the approximate threshold.
 * 2. Full lines: starting two levels (0.2 LogMAR) larger than the first miss,
 *    present `trialsPerLine` optotypes per level. A line is passed when at
 *    least `passThreshold` are identified correctly.
 *      - Pass → step down (smaller), unless the smaller level was already tested.
 *      - Fail → step up (larger), unless the larger level was already tested.
 *    The test ends when a failed line sits directly below a passed line, when
 *    the smallest level is passed, or when the largest level is failed.
 * 3. Scoring: ETDRS-style letter-by-letter scoring. Every line above the
 *    largest full line tested is credited as fully read, and each correct
 *    optotype is worth (step / trialsPerLine) LogMAR:
 *      LogMAR = (largestFullLevel + step) − (step / trialsPerLine) · totalCorrect
 *
 * Directions are randomised for every presentation and never repeat twice in
 * a row so the user always perceives a change of stimulus.
 */

import { LOGMAR_STEP, roundTo } from "./optometry";

export const DIRECTIONS = ["up", "right", "down", "left"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type Answer = Direction | "unsure";

export type RandomSource = () => number;

export interface EngineConfig {
  /** Testable LogMAR levels, descending (largest optotype first), contiguous 0.1 steps. */
  levels: readonly number[];
  trialsPerLine: number;
  passThreshold: number;
}

export const DEFAULT_TRIALS_PER_LINE = 5;
export const DEFAULT_PASS_THRESHOLD = 3;

export interface Trial {
  phase: "screening" | "full";
  logMAR: number;
  shown: Direction;
  answer: Answer;
  correct: boolean;
}

export interface LineResult {
  logMAR: number;
  correct: number;
  total: number;
}

export interface EngineState {
  phase: "screening" | "full" | "done";
  levelIndex: number;
  direction: Direction;
  /** Trials answered on the current full line. */
  lineAnswered: number;
  lineCorrect: number;
  /** Completed full lines, keyed by level index. */
  lines: Record<number, LineResult>;
  history: Trial[];
}

export function randomDirection(rand: RandomSource, previous?: Direction): Direction {
  const pool = previous ? DIRECTIONS.filter((d) => d !== previous) : DIRECTIONS;
  const idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[idx];
}

export function createEngine(config: EngineConfig, rand: RandomSource = Math.random): EngineState {
  if (config.levels.length === 0) {
    throw new Error("Engine requires at least one testable level");
  }
  return {
    phase: "screening",
    levelIndex: 0,
    direction: randomDirection(rand),
    lineAnswered: 0,
    lineCorrect: 0,
    lines: {},
    history: [],
  };
}

export function answer(
  state: EngineState,
  given: Answer,
  config: EngineConfig,
  rand: RandomSource = Math.random,
): EngineState {
  if (state.phase === "done") return state;

  const last = config.levels.length - 1;
  const logMAR = config.levels[state.levelIndex];
  const correct = given === state.direction;
  const history: Trial[] = [
    ...state.history,
    { phase: state.phase, logMAR, shown: state.direction, answer: given, correct },
  ];
  const nextDirection = randomDirection(rand, state.direction);

  if (state.phase === "screening") {
    if (correct && state.levelIndex < last) {
      return { ...state, levelIndex: state.levelIndex + 1, direction: nextDirection, history };
    }
    // First miss, or every screening level read: switch to full lines two levels larger.
    const start = Math.max(0, state.levelIndex - 2);
    return {
      ...state,
      phase: "full",
      levelIndex: start,
      direction: nextDirection,
      lineAnswered: 0,
      lineCorrect: 0,
      history,
    };
  }

  const lineAnswered = state.lineAnswered + 1;
  const lineCorrect = state.lineCorrect + (correct ? 1 : 0);

  if (lineAnswered < config.trialsPerLine) {
    return { ...state, lineAnswered, lineCorrect, direction: nextDirection, history };
  }

  const i = state.levelIndex;
  const lines = { ...state.lines, [i]: { logMAR, correct: lineCorrect, total: lineAnswered } };
  const passed = lineCorrect >= config.passThreshold;

  let next: number | null;
  if (passed) {
    next = i === last || lines[i + 1] ? null : i + 1;
  } else {
    next = i === 0 || lines[i - 1] ? null : i - 1;
  }

  if (next === null) {
    return { ...state, phase: "done", lines, lineAnswered: 0, lineCorrect: 0, history };
  }
  return {
    ...state,
    levelIndex: next,
    direction: nextDirection,
    lines,
    lineAnswered: 0,
    lineCorrect: 0,
    history,
  };
}

export interface EyeScore {
  logMAR: number;
  /** True when the user could not pass the largest level shown (score is an upper bound). */
  worseThanRange: boolean;
  /** True when the smallest renderable level was passed (score is a floor, true acuity may be better). */
  betterThanRange: boolean;
  largestLevel: number;
  smallestLevel: number;
  lines: LineResult[];
  totalCorrect: number;
  totalPresented: number;
}

export function scoreEngine(state: EngineState, config: EngineConfig): EyeScore {
  const indices = Object.keys(state.lines)
    .map(Number)
    .sort((a, b) => a - b);
  if (indices.length === 0) {
    throw new Error("Cannot score an engine with no completed lines");
  }
  const lines = indices.map((i) => state.lines[i]);
  const perOptotype = LOGMAR_STEP / config.trialsPerLine;
  const totalCorrect = lines.reduce((s, l) => s + l.correct, 0);
  const totalPresented = lines.reduce((s, l) => s + l.total, 0);
  const base = config.levels[indices[0]] + LOGMAR_STEP;
  const logMAR = roundTo(base - perOptotype * totalCorrect, 2);

  const last = config.levels.length - 1;
  const top = state.lines[0];
  const bottom = state.lines[last];

  return {
    logMAR,
    worseThanRange: top !== undefined && top.correct < config.passThreshold,
    betterThanRange: bottom !== undefined && bottom.correct >= config.passThreshold,
    largestLevel: config.levels[0],
    smallestLevel: config.levels[last],
    lines,
    totalCorrect,
    totalPresented,
  };
}

/** Progress helper used for UI hints: optotype number within the current line. */
export function trialLabel(state: EngineState, config: EngineConfig): string {
  if (state.phase === "screening") return "Quick screening";
  if (state.phase === "done") return "Complete";
  return `Symbol ${state.lineAnswered + 1} of ${config.trialsPerLine}`;
}
