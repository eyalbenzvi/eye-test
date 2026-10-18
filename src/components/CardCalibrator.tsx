"use client";

import { useEffect, useState } from "react";
import { ID1_CARD } from "@/lib/optometry";

/** 96 CSS px per inch is the CSS reference pixel; a sensible starting estimate. */
export const DEFAULT_PX_PER_MM = 96 / 25.4;
const MIN_WIDTH_PX = 120;
const MAX_WIDTH_PX = 1200;

interface CardCalibratorProps {
  initialWidthPx?: number;
  onChange: (widthPx: number) => void;
}

export function CardCalibrator({ initialWidthPx, onChange }: CardCalibratorProps) {
  const [widthPx, setWidthPx] = useState(
    () => initialWidthPx ?? Math.round(ID1_CARD.widthMm * DEFAULT_PX_PER_MM * 10) / 10,
  );
  const [maxWidth, setMaxWidth] = useState(MAX_WIDTH_PX);

  useEffect(() => {
    const update = () => setMaxWidth(Math.min(MAX_WIDTH_PX, Math.floor(window.innerWidth - 32)));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => onChange(widthPx), [widthPx, onChange]);

  const set = (v: number) => setWidthPx(Math.round(Math.min(maxWidth, Math.max(MIN_WIDTH_PX, v)) * 10) / 10);

  const heightPx = (widthPx * ID1_CARD.heightMm) / ID1_CARD.widthMm;
  const radiusPx = (widthPx * ID1_CARD.cornerRadiusMm) / ID1_CARD.widthMm;
  const pxPerMm = widthPx / ID1_CARD.widthMm;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full justify-center overflow-hidden py-2">
        <div
          aria-label="On-screen credit card outline"
          className="relative flex-none border-2 border-black bg-gradient-to-br from-slate-100 to-slate-300"
          style={{ width: widthPx, height: heightPx, borderRadius: radiusPx, boxSizing: "border-box" }}
        >
          {/* Chip and stripe hints help users orient a real card against the outline. */}
          <div
            className="absolute rounded-sm border border-amber-700/50 bg-amber-300/80"
            style={{ left: widthPx * 0.1, top: heightPx * 0.36, width: widthPx * 0.14, height: heightPx * 0.2 }}
          />
          <div className="absolute bottom-[12%] left-[10%] right-[10%] text-center font-mono text-[10px] uppercase tracking-widest text-slate-600 sm:text-xs">
            85.6 × 53.98 mm
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4">
        <label htmlFor="card-size" className="sr-only">
          Card width in pixels
        </label>
        <input
          id="card-size"
          type="range"
          min={MIN_WIDTH_PX}
          max={maxWidth}
          step={0.5}
          value={widthPx}
          onChange={(e) => set(Number(e.target.value))}
          className="h-3 w-full cursor-pointer accent-clinic-600"
        />
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "−10", delta: -10, aria: "Shrink a lot" },
            { label: "−0.5", delta: -0.5, aria: "Shrink slightly" },
            { label: "+0.5", delta: 0.5, aria: "Grow slightly" },
            { label: "+10", delta: 10, aria: "Grow a lot" },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              aria-label={b.aria}
              onClick={() => set(widthPx + b.delta)}
              className="rounded-lg border-2 border-slate-900 bg-white py-3 text-lg font-semibold text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-clinic-600/40"
            >
              {b.label}
            </button>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Card width" value={`${widthPx.toFixed(1)} px`} />
          <Stat label="Pixels per mm" value={pxPerMm.toFixed(3)} />
          <Stat label="Effective CSS DPI" value={(pxPerMm * 25.4).toFixed(0)} />
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-mono text-base font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
