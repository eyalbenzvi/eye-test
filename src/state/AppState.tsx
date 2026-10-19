"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { currentDeviceInfo, estimateScale, type DeviceClass } from "@/lib/calibration";
import { chooseNearDistance } from "@/lib/rendering";
import type { EyeScore } from "@/lib/testEngine";

export type Eye = "right" | "left";


export interface Calibration {
  /** CSS pixels per physical millimetre. */
  pxPerMm: number;
  /** "card": matched by the user against a bank card. "estimated": inferred from the device type. */
  method: "card" | "estimated";
  /** Typical relative error of the scale (0 for a card match). */
  typicalError: number;
  deviceClass?: DeviceClass;
  /** On-screen card width (CSS px) the user matched to the physical card. */
  cardWidthPx?: number;
  /** Device pixel ratio at calibration time; a change implies browser zoom or a different display. */
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  calibratedAt: string;
}

export interface TestResults {
  right?: EyeScore;
  left?: EyeScore;
  startedAt: string;
  completedAt?: string;
  distanceMm: number;
  crowding: boolean;
  calibration: Calibration;
}

export interface AppState {
  hydrated: boolean;
  /** Optional card calibration; when absent the screen scale is estimated. */
  calibration: Calibration | null;
  results: TestResults | null;
}

type Action =
  | { type: "hydrate"; state: Partial<AppState> }
  | { type: "setCalibration"; calibration: Calibration }
  | { type: "startTest"; plan: TestPlan }
  | { type: "recordEye"; eye: Eye; score: EyeScore };

const STORAGE_KEY = "acuity-check:v2";

const initialState: AppState = { hydrated: false, calibration: null, results: null };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state, hydrated: true };
    case "setCalibration":
      return { ...state, calibration: action.calibration };
    case "startTest":
      return {
        ...state,
        results: {
          startedAt: new Date().toISOString(),
          distanceMm: action.plan.distanceMm,
          crowding: true,
          calibration: action.plan.calibration,
        },
      };
    case "recordEye": {
      if (!state.results) return state;
      const results = { ...state.results, [action.eye]: action.score };
      if (results.right && results.left) results.completedAt = new Date().toISOString();
      return { ...state, results };
    }
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  /** Begin a fresh two-eye test with the best available screen scale. */
  startTest: () => void;
  /** Screen scale and viewing distance the next test will use (null until hydrated). */
  plan: TestPlan | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let stored: Partial<AppState> = {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as Partial<AppState>;
    } catch {
      // Storage unavailable (private mode) or corrupt: start fresh.
    }
    dispatch({ type: "hydrate", state: stored });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, hydrated: undefined }));
    } catch {
      // Non-fatal: the session still works in memory.
    }
  }, [state]);

  const card = state.calibration;
  const plan = useMemo(() => (state.hydrated ? planTest(card) : null), [state.hydrated, card]);
  const startTest = useCallback(() => dispatch({ type: "startTest", plan: planTest(card) }), [card]);

  const value = useMemo(() => ({ state, dispatch, startTest, plan }), [state, startTest, plan]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}

export interface TestPlan {
  calibration: Calibration;
  distanceMm: number;
}

/** Best available screen scale, and the nearest distance at which this screen can draw the small symbols. */
export function planTest(card: Calibration | null): TestPlan {
  const calibration = card && calibrationMatchesDisplay(card) ? card : estimatedCalibration();
  return { calibration, distanceMm: chooseNearDistance(calibration.pxPerMm, window.devicePixelRatio || 1) };
}

function displaySnapshot() {
  return {
    devicePixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    calibratedAt: new Date().toISOString(),
  };
}

export function estimatedCalibration(): Calibration {
  const est = estimateScale(currentDeviceInfo());
  return {
    pxPerMm: est.pxPerMm,
    method: "estimated",
    typicalError: est.typicalError,
    deviceClass: est.deviceClass,
    ...displaySnapshot(),
  };
}

export function cardCalibration(cardWidthPx: number, cardWidthMm: number): Calibration {
  return { pxPerMm: cardWidthPx / cardWidthMm, method: "card", typicalError: 0, cardWidthPx, ...displaySnapshot() };
}

/** Whether a stored calibration still matches the current display (no zoom / display change). */
export function calibrationMatchesDisplay(calibration: Calibration | null): boolean {
  if (!calibration || typeof window === "undefined") return false;
  // Compare orientation-independent dimensions so rotating a phone does not invalidate calibration.
  const now = [window.screen.width, window.screen.height].sort((a, b) => a - b);
  const then = [calibration.screenWidth, calibration.screenHeight].sort((a, b) => a - b);
  return (
    Math.abs(window.devicePixelRatio - calibration.devicePixelRatio) < 0.01 &&
    now[0] === then[0] &&
    now[1] === then[1]
  );
}
