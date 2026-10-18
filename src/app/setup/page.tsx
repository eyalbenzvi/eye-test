"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryLink, Shell } from "@/components/Shell";
import { useRequireStep } from "@/components/useRequireStep";
import { DISTANCE_OPTIONS, formatLogMAR, optotypeHeightMm } from "@/lib/optometry";
import { CROWDED_EXTENT_RATIO, analyseLevels, testableLevels } from "@/lib/rendering";
import { useAppState, type AppState } from "@/state/AppState";

const needsCalibration = (s: AppState) => s.disclaimerAccepted && s.calibration !== null;

export default function SetupPage() {
  const ready = useRequireStep(needsCalibration, "/calibrate");
  const { state, dispatch } = useAppState();
  const router = useRouter();
  const [viewport, setViewport] = useState<{ w: number; h: number; dpr: number } | null>(null);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!ready || !state.calibration) return null;
  const { pxPerMm } = state.calibration;

  let rangeText: string | null = null;
  if (viewport) {
    // Rough preview: the test screen reserves ~45% of the height for instructions and controls.
    const scale = state.crowding ? CROWDED_EXTENT_RATIO : 1;
    const levels = testableLevels(
      analyseLevels(state.distanceMm, {
        pxPerMm,
        devicePixelRatio: viewport.dpr,
        availableWidthPx: (viewport.w - 32) / scale,
        availableHeightPx: (viewport.h * 0.55) / scale,
      }),
    );
    rangeText = levels.length
      ? `${formatLogMAR(levels[0])} to ${formatLogMAR(levels[levels.length - 1])} LogMAR`
      : "None — try a larger screen or the other distance";
  }

  return (
    <Shell step="setup">
      <div className="space-y-8">
        <header className="max-w-3xl space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Choose your testing distance</h1>
          <p className="text-slate-600">
            Measure the distance from the screen to your eyes with a tape measure — accuracy matters. An error of 10% in
            distance changes your score by about half a line.
          </p>
        </header>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Testing distance</legend>
          {DISTANCE_OPTIONS.map((opt) => {
            const selected = state.distanceMm === opt.mm;
            return (
              <label
                key={opt.mm}
                className={`cursor-pointer rounded-2xl border-2 p-6 ${
                  selected ? "border-clinic-600 bg-clinic-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="distance"
                  className="sr-only"
                  checked={selected}
                  onChange={() => dispatch({ type: "setDistance", distanceMm: opt.mm })}
                />
                <span className="block text-3xl font-bold text-slate-900">{opt.metricLabel}</span>
                <span className="block text-lg text-slate-600">{opt.imperialLabel}</span>
                <span className="mt-3 block text-sm text-slate-500">
                  6/6 symbol height: {optotypeHeightMm(0, opt.mm).toFixed(2)} mm
                </span>
                <span className="block text-sm text-slate-500">
                  {opt.mm === 3000
                    ? "Recommended for tablets, laptops and desktop monitors."
                    : "Suits smaller rooms and smartphones."}
                </span>
              </label>
            );
          })}
        </fieldset>

        <label className="flex max-w-3xl cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={state.crowding}
            onChange={(e) => dispatch({ type: "setCrowding", crowding: e.target.checked })}
            className="mt-0.5 h-5 w-5 accent-clinic-600"
          />
          <span className="text-sm text-slate-700">
            <span className="font-semibold">Use crowding bars (recommended).</span> Surrounds each symbol with bars that
            mimic the neighbouring letters of a printed chart. Single isolated symbols tend to overestimate acuity,
            particularly in amblyopia.
          </span>
        </label>

        <div className="max-w-3xl rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Calibration:</span> {pxPerMm.toFixed(3)} px/mm
          </p>
          <p>
            <span className="font-semibold">Measurable range on this screen:</span> {rangeText ?? "…"}
          </p>
          <p className="mt-1 text-slate-500">
            Levels that cannot be drawn accurately (too large to fit, or too small for your screen&apos;s pixels) are
            skipped automatically. Using full-screen mode during the test increases the range.
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-4">
          <SecondaryLink href="/calibrate">Back</SecondaryLink>
          <PrimaryButton onClick={() => router.push("/checklist")}>Continue</PrimaryButton>
        </div>
      </div>
    </Shell>
  );
}
