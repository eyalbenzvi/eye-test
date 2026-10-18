"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DirectionPad } from "@/components/DirectionPad";
import { TumblingE } from "@/components/TumblingE";
import { useRequireStep } from "@/components/useRequireStep";
import { distanceOption, formatLogMAR } from "@/lib/optometry";
import { CROWDED_EXTENT_RATIO, analyseLevels, snapOptotypeSize, testableLevels } from "@/lib/rendering";
import {
  DEFAULT_PASS_THRESHOLD,
  DEFAULT_TRIALS_PER_LINE,
  answer as engineAnswer,
  createEngine,
  scoreEngine,
  trialLabel,
  type Answer,
  type EngineConfig,
  type EngineState,
} from "@/lib/testEngine";
import { calibrationMatchesDisplay, useAppState, type AppState, type Eye } from "@/state/AppState";

type Stage = "intro" | "running" | "paused" | "rest";

const needsStartedTest = (s: AppState) => s.calibration !== null && s.results !== null;

/** Cryptographically strong randomness so directions cannot be anticipated. */
const secureRandom = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

/** Ignore inputs arriving faster than this after an answer (key bounce, double-firing remotes). */
const INPUT_LOCKOUT_MS = 250;
const REST_SECONDS = 10;
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
  const ready = useRequireStep(needsStartedTest, "/checklist");
  const { state, dispatch } = useAppState();
  const router = useRouter();

  const [eye, setEye] = useState<Eye>("right");
  const [stage, setStage] = useState<Stage>("intro");
  const [session, setSession] = useState<EyeSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restLeft, setRestLeft] = useState(REST_SECONDS);
  const [displayOk, setDisplayOk] = useState(true);
  const stimulusRef = useRef<HTMLDivElement>(null);
  const lastInput = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const results = state.results;
  const calibration = results?.calibration;
  const crowding = results?.crowding ?? true;
  const distanceMm = results?.distanceMm ?? 3000;

  useEffect(() => {
    if (calibration) setDisplayOk(calibrationMatchesDisplay(calibration));
  }, [calibration]);

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
      setError(
        "This screen cannot draw the test symbols accurately at the selected distance. Try full-screen mode, a larger screen, or a longer distance.",
      );
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
    setSession({ config, engine: createEngine(config, secureRandom), sizes });
    lastInput.current = performance.now();
    setStage("running");
  }, [calibration, crowding, distanceMm]);

  const finishEye = useCallback(
    (finished: EyeSession) => {
      const score = scoreEngine(finished.engine, finished.config);
      dispatch({ type: "recordEye", eye, score });
      setSession(null);
      if (eye === "right") {
        setEye("left");
        setRestLeft(REST_SECONDS);
        setStage("rest");
      } else {
        router.push("/results");
      }
    },
    [dispatch, eye, router],
  );

  const respond = useCallback(
    (a: Answer) => {
      if (stage !== "running" || !session) return;
      const now = performance.now();
      if (now - lastInput.current < INPUT_LOCKOUT_MS) return;
      lastInput.current = now;
      const engine = engineAnswer(session.engine, a, session.config, secureRandom);
      const next = { ...session, engine };
      if (engine.phase === "done") finishEye(next);
      else setSession(next);
    },
    [stage, session, finishEye],
  );

  // Rest countdown between eyes.
  useEffect(() => {
    if (stage !== "rest" || restLeft <= 0) return;
    const t = window.setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [stage, restLeft]);

  // Keyboard / presenter remote control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const mapped = KEY_MAP[e.key];
      const isAction = mapped !== undefined || e.key === "Enter";
      if (isAction) e.preventDefault();

      if (stage === "running") {
        if (e.key === "Escape") setStage("paused");
        else if (mapped) respond(mapped);
      } else if (stage === "paused") {
        if (isAction || e.key === "Escape") {
          lastInput.current = performance.now();
          setStage("running");
        }
      } else if (stage === "intro") {
        if (isAction) startEye();
      } else if (stage === "rest" && restLeft <= 0) {
        if (isAction) {
          setStage("intro");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, respond, startEye, restLeft]);

  // Swipe in the direction the E's bars point (touch, pen or mouse drag).
  const onPointerDown = (e: React.PointerEvent) => {
    if (stage === "running") swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || stage !== "running") return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    // Require a deliberate, clearly horizontal or vertical stroke.
    if (Math.max(ax, ay) < SWIPE_MIN_PX || Math.max(ax, ay) < 1.5 * Math.min(ax, ay)) return;
    respond(ax > ay ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  if (!ready || !results || !calibration) return null;

  const distance = distanceOption(distanceMm);
  const near = distance.mode === "near";
  const covered = eye === "right" ? "LEFT" : "RIGHT";
  const testing = eye === "right" ? "RIGHT" : "LEFT";
  const current = session && stage !== "intro" ? session : null;
  const logMAR = current ? current.config.levels[current.engine.levelIndex] : null;
  const size = current && logMAR !== null ? current.sizes[logMAR] : null;

  return (
    <div className="no-motion flex h-[100dvh] flex-col bg-white text-black">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-xs sm:text-sm">
        <div className="font-semibold">
          {testing} eye · {distance.metricLabel}
          {current && logMAR !== null && (
            <span className="ml-2 font-normal text-slate-500">
              {trialLabel(current.engine, current.config)} · Level {formatLogMAR(logMAR)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {stage === "running" && (
            <button type="button" onClick={() => setStage("paused")} className="rounded border border-slate-300 px-2 py-1">
              Pause
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} className="rounded border border-slate-300 px-2 py-1">
            Full screen
          </button>
          <Link href="/checklist" className="rounded border border-slate-300 px-2 py-1">
            Exit
          </Link>
        </div>
      </div>

      {/* Stimulus canvas: pure white, nothing but the optotype while running. */}
      <div
        ref={stimulusRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
        style={{ touchAction: stage === "running" ? "none" : "auto" }}
        className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden bg-white"
      >
        {stage === "running" && current && size && (
          <TumblingE
            key={current.engine.history.length}
            direction={current.engine.direction}
            sizePx={size.sizeCssPx}
            crowding={crowding}
            pixelAligned={size.pixelAligned}
          />
        )}

        {stage === "intro" && (
          <Overlay>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              {eye === "right" ? "Part 1 of 2" : "Part 2 of 2"}
            </p>
            <h1 className="text-4xl font-black sm:text-6xl">Cover your {covered} eye</h1>
            <p className="max-w-xl text-lg text-slate-700 sm:text-xl">
              Use your palm or an eye patch. Do not press on the eye, and keep both eyes open behind the cover.{" "}
              {near
                ? `Hold the phone upright, ${distance.metricLabel} (${distance.imperialLabel}) from your eyes, and keep it there.`
                : `Stand at ${distance.metricLabel} (${distance.imperialLabel}).`}
            </p>
            <p className="max-w-xl text-base text-slate-600">
              {near
                ? "For each symbol, tap the arrow for the direction the bars of the E point, or swipe that way on the white area. If you cannot tell, take your best guess or tap Unsure."
                : "For each symbol, answer the direction the bars of the E point. If you cannot tell, take your best guess or choose Unsure."}
            </p>
            {!displayOk && (
              <p className="max-w-xl rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
                Browser zoom or display has changed since calibration, so symbol sizes may be wrong.{" "}
                <Link href="/calibrate" className="font-semibold underline">
                  Recalibrate
                </Link>
              </p>
            )}
            {error && <p className="max-w-xl rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</p>}
            <button
              type="button"
              onClick={startEye}
              className="rounded-2xl bg-black px-8 py-4 text-xl font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400"
            >
              Start {testing.toLowerCase()} eye
            </button>
            {!near && <p className="text-sm text-slate-500">or press any arrow key / Space</p>}
          </Overlay>
        )}

        {stage === "paused" && (
          <Overlay>
            <h1 className="text-4xl font-black sm:text-5xl">Paused</h1>
            <p className="text-lg text-slate-700">Press any arrow key, Space or Esc to continue.</p>
            <button
              type="button"
              onClick={() => {
                lastInput.current = performance.now();
                setStage("running");
              }}
              className="rounded-2xl bg-black px-8 py-4 text-xl font-bold text-white"
            >
              Resume
            </button>
          </Overlay>
        )}

        {stage === "rest" && (
          <Overlay>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Right eye complete</p>
            <h1 className="text-4xl font-black sm:text-5xl">Rest your eyes</h1>
            <p className="max-w-xl text-lg text-slate-700">
              Uncover your eye and look at something far away for a few seconds. Next you will cover your{" "}
              <strong>RIGHT</strong> eye and test the left.
            </p>
            {restLeft > 0 ? (
              <p className="text-3xl font-bold tabular-nums">{restLeft}</p>
            ) : (
              <button
                type="button"
                onClick={() => setStage("intro")}
                className="rounded-2xl bg-black px-8 py-4 text-xl font-bold text-white"
              >
                Continue to left eye
              </button>
            )}
          </Overlay>
        )}
      </div>

      {/* Always laid out so the stimulus area measured at the intro matches the area while running. */}
      <div
        className={`flex justify-center border-t border-slate-200 bg-white px-3 py-3 ${
          stage === "running" || stage === "paused" ? "" : "invisible"
        }`}
      >
        <DirectionPad onAnswer={respond} disabled={stage !== "running"} large={near} />
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-white px-6 py-8 text-center">
      {children}
    </div>
  );
}
