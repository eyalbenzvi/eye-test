"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { TestDistance } from "@/lib/optometry";
import type { EyeScore } from "@/lib/testEngine";

export type Eye = "right" | "left";

export interface Calibration {
  /** Calibrated CSS pixels per physical millimetre. */
  pxPerMm: number;
  /** On-screen card width (CSS px) the user matched to the physical card. */
  cardWidthPx: number;
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
  distanceMm: TestDistance;
  crowding: boolean;
  calibration: Calibration;
}

export interface AppState {
  hydrated: boolean;
  disclaimerAccepted: boolean;
  calibration: Calibration | null;
  distanceMm: TestDistance;
  crowding: boolean;
  checklistConfirmed: boolean;
  results: TestResults | null;
}

type Action =
  | { type: "hydrate"; state: Partial<AppState> }
  | { type: "acceptDisclaimer" }
  | { type: "setCalibration"; calibration: Calibration }
  | { type: "setDistance"; distanceMm: TestDistance }
  | { type: "setCrowding"; crowding: boolean }
  | { type: "setChecklist"; confirmed: boolean }
  | { type: "startTest" }
  | { type: "recordEye"; eye: Eye; score: EyeScore };

const STORAGE_KEY = "acuity-check:v1";

const initialState: AppState = {
  hydrated: false,
  disclaimerAccepted: false,
  calibration: null,
  distanceMm: 3000,
  crowding: true,
  checklistConfirmed: false,
  results: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state, hydrated: true };
    case "acceptDisclaimer":
      return { ...state, disclaimerAccepted: true };
    case "setCalibration":
      return { ...state, calibration: action.calibration };
    case "setDistance":
      return { ...state, distanceMm: action.distanceMm };
    case "setCrowding":
      return { ...state, crowding: action.crowding };
    case "setChecklist":
      return { ...state, checklistConfirmed: action.confirmed };
    case "startTest":
      if (!state.calibration) return state;
      return {
        ...state,
        results: {
          startedAt: new Date().toISOString(),
          distanceMm: state.distanceMm,
          crowding: state.crowding,
          calibration: state.calibration,
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
  acceptDisclaimer: () => void;
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
    if (stored.distanceMm === undefined && window.matchMedia?.("(pointer: coarse)").matches) {
      // Touch devices default to the hand-held near test.
      stored.distanceMm = 400;
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

  const acceptDisclaimer = useCallback(() => dispatch({ type: "acceptDisclaimer" }), []);
  const value = useMemo(() => ({ state, dispatch, acceptDisclaimer }), [state, acceptDisclaimer]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}

/** Whether the stored calibration still matches the current display (no zoom / display change). */
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
