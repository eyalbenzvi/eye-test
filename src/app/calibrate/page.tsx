"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CardCalibrator } from "@/components/CardCalibrator";
import { PrimaryButton, SecondaryLink, Shell } from "@/components/Shell";
import { ID1_CARD } from "@/lib/optometry";
import { calibrationMatchesDisplay, cardCalibration, estimatedCalibration, useAppState } from "@/state/AppState";

export default function CalibratePage() {
  const { state, dispatch } = useAppState();
  const router = useRouter();
  const [widthPx, setWidthPx] = useState<number | null>(null);
  const [verify, setVerify] = useState(false);
  const onChange = useCallback((w: number) => setWidthPx(w), []);

  // Wait for stored state; the calibrator's starting size also needs `window`.
  if (!state.hydrated) return null;

  const existing = state.calibration && calibrationMatchesDisplay(state.calibration) ? state.calibration : null;
  const pxPerMm = widthPx ? widthPx / ID1_CARD.widthMm : null;

  const save = () => {
    if (!widthPx) return;
    dispatch({ type: "setCalibration", calibration: cardCalibration(widthPx, ID1_CARD.widthMm) });
    router.push("/");
  };

  return (
    <Shell>
      <div className="space-y-8">
        <header className="max-w-3xl space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calibrate your screen</h1>
          <p className="text-slate-600">
            Screens differ in pixel density, so the app needs to learn how large a millimetre is on yours. Use any card
            with the standard ISO/IEC 7810 ID-1 size (bank card, driving licence, ID or loyalty card — 85.6 × 53.98 mm).
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Set browser zoom to 100% and keep it unchanged for the whole test.</li>
            <li>
              Hold the card flat against the screen, aligning its top-left corner with the outline. On a phone the
              outline stands upright, so hold the card upright too.
            </li>
            <li>Use the slider or the buttons until the outline&apos;s outer edge matches the card exactly.</li>
            <li>Look straight at the screen (not at an angle) when judging the edges.</li>
          </ol>
          {state.calibration && !existing && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Your display or zoom level has changed since the last calibration. Please calibrate again.
            </p>
          )}
        </header>

        <CardCalibrator
          initialWidthPx={existing?.cardWidthPx ?? estimatedCalibration().pxPerMm * ID1_CARD.widthMm}
          onChange={onChange}
        />

        <div className="mx-auto max-w-xl space-y-3">
          <button
            type="button"
            onClick={() => setVerify((v) => !v)}
            className="text-sm font-semibold text-clinic-700 underline underline-offset-4"
          >
            {verify ? "Hide ruler check" : "Verify with a ruler (optional)"}
          </button>
          {verify && pxPerMm && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">This bar should measure exactly 50 mm with a ruler.</p>
              <div className="relative h-6" style={{ width: 50 * pxPerMm }}>
                <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-black" />
                {Array.from({ length: 11 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 w-px bg-black"
                    style={{ left: i * 5 * pxPerMm, height: i % 2 === 0 ? 24 : 12 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-4">
          <SecondaryLink href="/">Cancel</SecondaryLink>
          <PrimaryButton onClick={save} disabled={!widthPx}>
            Save calibration
          </PrimaryButton>
        </div>
      </div>
    </Shell>
  );
}
