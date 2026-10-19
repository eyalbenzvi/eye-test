"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DirectionPad } from "@/components/DirectionPad";
import { TumblingE } from "@/components/TumblingE";
import { useRequireStep } from "@/components/useRequireStep";
import { CROWDED_EXTENT_RATIO, analyseLevels, snapOptotypeSize, testableLevels } from "@/lib/rendering";
import {
  DEFAULT_PASS_THRESHOLD,
  DEFAULT_TRIALS_PER_LINE,
  answer as engineAnswer,
  createEngine,
  scoreEngine,
  type Answer,
  type EngineConfig,
  type EngineState,
} from "@/lib/testEngine";
import { useAppState, type AppState, type Eye } from "@/state/AppState";

const needsStartedTest = (s: AppState) => s.results !== null;

/** Cryptographically strong randomness so directions cannot be anticipated. */
const secureRandom = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

/** Ignore inputs arriving faster than this after an answer (double taps, key bounce). */
const INPUT_LOCKOUT_MS = 250;
const SWIPE_MIN_PX = 40;

const KEY_MAP: Record<string, Answer> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  " ": "unsure",
  Spacebar: "unsure",
};

interface EyeSession {
  config: EngineConfig;
  engine: EngineState;
  sizes: Record<number, { sizeCssPx: number; pixelAligned: boolean }>;
}

export default function TestPage() {
  const ready = useRequireStep(needsStartedTest, "/");
  const { state, dispatch } = useAppState();
  const router = useRouter();

  const [eye, setEye] = useState<Eye>("right");
  const [session, setSession] = useState<EyeSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stimulusRef = useRef<HTMLDivElement>(null);
  const lastInput = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const results = state.results;
  const calibration = results?.calibration;
  const crowding = results?.crowding ?? true;
  const distanceMm = results?.distanceMm ?? 400;
  const running = session !== null;

  const startEye = useCallback(() => {
    if (!calibration || !stimulusRef.current) return;
    const rect = stimulusRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const extent = crowding ? CROWDED_EXTENT_RATIO : 1;
    const margin = 16;
    const info = analyseLevels(distanceMm, {
      pxPerMm: calibration.pxPerMm,
      devicePixelRatio: dpr,
      availableWidthPx: (rect.width - margin) / extent,
      availableHeightPx: (rect.height - margin) / extent,
    });
    const levels = testableLevels(info);
    if (levels.length < 2) {
      setError("This screen cannot draw the test symbols accurately. Try rotating the phone or another device.");
      return;
    }
    setError(null);
    const config: EngineConfig = {
      levels,
      trialsPerLine: DEFAULT_TRIALS_PER_LINE,
      passThreshold: DEFAULT_PASS_THRESHOLD,
    };
    const sizes: EyeSession["sizes"] = {};
    for (const l of info) sizes[l.logMAR] = snapOptotypeSize(l.heightCssPx, dpr);
    lastInput.current = performance.now();
    setSession({ config, engine: createEngine(config, secureRandom), sizes });
  }, [calibration, crowding, distanceMm]);

  const respond = useCallback(
    (a: Answer) => {
      if (!session) return;
      const now = performance.now();
      if (now - lastInput.current < INPUT_LOCKOUT_MS) return;
      lastInput.current = now;
      const engine = engineAnswer(session.engine, a, session.config, secureRandom);
      if (engine.phase !== "done") {
        setSession({ ...session, engine });
        return;
      }
      dispatch({ type: "recordEye", eye, score: scoreEngine(engine, session.config) });
      setSession(null);
      if (eye === "right") setEye("left");
      else router.push("/results");
    },
    [session, dispatch, eye, router],
  );

  // Keyboard support (arrows, Space = unsure; any of them starts an eye).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const mapped = KEY_MAP[e.key];
      if (mapped === undefined && e.key !== "Enter") return;
      e.preventDefault();
      if (running) {
        if (mapped) respond(mapped);
      } else {
        startEye();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, respond, startEye]);

  // Swipe in the direction the E's bars point.
  const onPointerDown = (e: React.PointerEvent) => {
    if (running) swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !running) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    // Require a deliberate, clearly horizontal or vertical stroke.
    if (Math.max(ax, ay) < SWIPE_MIN_PX || Math.max(ax, ay) < 1.5 * Math.min(ax, ay)) return;
    respond(ax > ay ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  if (!ready || !results || !calibration) return null;

  const logMAR = session ? session.config.levels[session.engine.levelIndex] : null;
  const size = session && logMAR !== null ? session.sizes[logMAR] : null;

  return (
    <div className="no-motion flex h-[100dvh] flex-col bg-white text-black">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="font-semibold">{eye === "right" ? "Right eye" : "Left eye"}</span>
        <Link href="/" aria-label="Stop the test" className="rounded-lg px-3 py-1 text-slate-500">
          ✕
        </Link>
      </div>

      {/* Stimulus canvas: pure white, nothing but the optotype while running. */}
      <div
        ref={stimulusRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
        style={{ touchAction: running ? "none" : "auto" }}
        className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden bg-white"
      >
        {session && size && (
          <TumblingE
            key={session.engine.history.length}
            direction={session.engine.direction}
            sizePx={size.sizeCssPx}
            crowding={crowding}
            pixelAligned={size.pixelAligned}
          />
        )}

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-white px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              {eye === "right" ? "1 of 2" : "2 of 2"}
            </p>
            <h1 className="text-4xl font-black">Cover your {eye === "right" ? "LEFT" : "RIGHT"} eye</h1>
            <p className="max-w-sm text-lg text-slate-700">
              Stay {distanceMm / 10} cm from the screen. Use your palm, without pressing. Show which way the E points: tap an arrow or swipe. Not sure? Tap
              Unsure.
            </p>
            {error && <p className="max-w-sm rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</p>}
            <button
              type="button"
              onClick={startEye}
              className="w-full max-w-xs rounded-2xl bg-black py-5 text-xl font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400"
            >
              Go
            </button>
          </div>
        )}
      </div>

      {/* Always laid out so the area measured before starting matches the area while running. */}
      <div className={`flex justify-center bg-white px-3 pb-4 pt-2 ${running ? "" : "invisible"}`}>
        <DirectionPad onAnswer={respond} disabled={!running} large />
      </div>
    </div>
  );
}
