"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DISCLAIMER, PrimaryButton, Shell } from "@/components/Shell";
import { useRequireStep } from "@/components/useRequireStep";
import {
  URGENT_SYMPTOMS,
  classify,
  interocular,
  isConcern,
  recommend,
  type Severity,
  type Urgency,
} from "@/lib/insights";
import { describeDistance, formatLogMAR, mUnits, toNotations, type TestMode } from "@/lib/optometry";
import type { EyeScore } from "@/lib/testEngine";
import { useAppState, type AppState } from "@/state/AppState";

/** The single-file build runs in hosts where the print dialog is unavailable. */
const STANDALONE = process.env.NEXT_PUBLIC_STANDALONE === "1";

const needsResults = (s: AppState) => !!s.results?.right && !!s.results?.left;

const SEVERITY_STYLE: Record<Severity, string> = {
  normal: "bg-emerald-100 text-emerald-900",
  limit: "bg-sky-100 text-sky-900",
  borderline: "bg-lime-100 text-lime-900",
  mild: "bg-amber-100 text-amber-900",
  moderate: "bg-orange-100 text-orange-900",
  severe: "bg-red-100 text-red-900",
};

const URGENCY_STYLE: Record<Urgency, string> = {
  routine: "border-emerald-400 bg-emerald-50 text-emerald-950",
  recommended: "border-amber-400 bg-amber-50 text-amber-950",
  prompt: "border-red-400 bg-red-50 text-red-950",
};

/** Displayed score, clamped to the measured range with an inequality qualifier where needed. */
function displayScore(score: EyeScore, distanceMm: number) {
  const d = distanceMm / 1000;
  const m = (logMAR: number) => `${d}/${mUnits(logMAR, distanceMm).toFixed(2)}M`;
  if (score.worseThanRange) {
    const n = toNotations(score.largestLevel);
    return {
      mUnits: `worse than ${m(score.largestLevel)}`,
      logMAR: `> ${formatLogMAR(score.largestLevel)}`,
      decimal: `< ${n.decimal.toFixed(2)}`,
      metric: `< ${n.snellenMetric}`,
      imperial: `worse than ${n.snellenImperial}`,
      note: "Could not read the largest symbol this screen could show.",
    };
  }
  const n = toNotations(score.logMAR);
  const q = score.betterThanRange ? "≥ " : "";
  return {
    mUnits: `${score.betterThanRange ? "≤ " : ""}${m(n.logMAR)}`,
    logMAR: `${score.betterThanRange ? "≤ " : ""}${formatLogMAR(n.logMAR)}`,
    decimal: `${q}${n.decimal.toFixed(2)}`,
    metric: `${q}${n.snellenMetric}`,
    imperial: `${q}${n.snellenImperial}`,
    note: score.betterThanRange ? "Read even the smallest symbol this screen could show." : null,
  };
}

export default function ResultsPage() {
  const ready = useRequireStep(needsResults, "/");
  const { state, startTest } = useAppState();
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  // Printing always includes the details.
  useEffect(() => {
    const open = () => setShowDetails(true);
    window.addEventListener("beforeprint", open);
    return () => window.removeEventListener("beforeprint", open);
  }, []);

  if (!ready || !state.results?.right || !state.results.left) return null;
  const { right, left, calibration, distanceMm, completedAt, startedAt } = state.results;
  const distance = describeDistance(distanceMm);
  const mode = distance.mode;
  const near = mode === "near";
  const io = interocular(right, left);
  const rec = recommend(right, left, mode);
  const date = new Date(completedAt ?? startedAt);
  const anyReduced = [right, left].some((s) => isConcern(classify(s, mode).severity));
  const estimated = calibration.method === "estimated";

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Your results</h1>
          <p className="text-sm text-slate-500">
            {near ? "Near vision" : "Distance vision"} · {date.toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <EyeTile title="Right eye" score={right} mode={mode} distanceMm={distanceMm} />
          <EyeTile title="Left eye" score={left} mode={mode} distanceMm={distanceMm} />
        </section>

        <section className={`print-card rounded-2xl border-2 p-4 ${URGENCY_STYLE[rec.urgency]}`} aria-live="polite">
          <h2 className="text-lg font-bold">{rec.headline}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {rec.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        {estimated && (
          <p className="text-xs text-slate-500">
            Symbol sizes were estimated for your device (typically within ±{Math.round(calibration.typicalError * 100)}
            %), so treat the result as approximate.
            {calibration.typicalError > 0.1 && (
              <>
                {" "}
                Screen sizes vary a lot on this kind of device.{" "}
                <Link href="/calibrate" className="font-semibold text-clinic-700 underline underline-offset-2">
                  Calibrate with a bank card
                </Link>{" "}
                for a reliable result.
              </>
            )}
          </p>
        )}

        <div className="flex flex-col gap-3 print:hidden">
          <PrimaryButton
            onClick={() => {
              startTest();
              router.push("/test");
            }}
          >
            Test again
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            className="py-2 text-sm font-semibold text-clinic-700 underline underline-offset-4"
          >
            {showDetails ? "Hide details" : "More details"}
          </button>
        </div>

        {showDetails && (
          <div className="flex flex-col gap-5">
            <section className="grid gap-4 sm:grid-cols-2">
              <EyeDetail title="Right eye (OD)" score={right} mode={mode} distanceMm={distanceMm} />
              <EyeDetail title="Left eye (OS)" score={left} mode={mode} distanceMm={distanceMm} />
            </section>

            {io.level !== "none" && (
              <section className="print-card rounded-2xl border border-slate-200 p-4 text-sm">
                <h2 className="font-bold">Difference between eyes</h2>
                <p className="mt-1 text-slate-700">
                  Your {io.weakerEye} eye scored {io.difference.toFixed(2)} LogMAR (≈{Math.round(io.difference * 10)}{" "}
                  line{io.difference >= 0.15 ? "s" : ""}) worse.{" "}
                  {io.level === "significant"
                    ? "Two lines or more is considered significant and is worth having checked."
                    : "A one-line difference is common and usually not a concern on its own."}
                </p>
              </section>
            )}

            {anyReduced && (
              <section className="print-card rounded-2xl border border-slate-200 p-4 text-sm">
                <h2 className="font-bold">What reduced {near ? "near" : "distance"} vision can mean</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                  {near ? (
                    <>
                      <li>
                        <strong>Presbyopia:</strong> the eye&apos;s lens gradually loses its ability to focus up close,
                        usually from about age 40. Reading glasses correct it.
                      </li>
                      <li>
                        <strong>Farsightedness (hyperopia):</strong> the eye works harder to focus, most of all up close,
                        which can cause blur, strain or headaches when reading.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong>Nearsightedness (myopia):</strong> distant objects look blurred while near vision is
                        clear.
                      </li>
                      <li>
                        <strong>Astigmatism:</strong> an unevenly curved cornea or lens blurs vision at all distances.
                      </li>
                    </>
                  )}
                  <li>
                    <strong>Other causes:</strong> outdated glasses, dry eye, cataract or retinal conditions. Only a
                    professional exam can tell these apart.
                  </li>
                </ul>
              </section>
            )}

            <section className="print-card rounded-2xl border border-slate-200 p-4 text-sm">
              <h2 className="font-bold">See an eye doctor the same day if you notice</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {URGENT_SYMPTOMS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>

            <section className="print-card rounded-2xl border border-slate-200 p-4 text-sm">
              <h2 className="font-bold">Test details</h2>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <Row k="Date" v={date.toLocaleString()} />
                <Row k="Viewing distance" v={`${distance.metricLabel} (${distance.imperialLabel})`} />
                <Row k="Symbol" v="Tumbling E with crowding bars" />
                <Row
                  k="Screen scale"
                  v={`${calibration.pxPerMm.toFixed(2)} px/mm (${estimated ? `estimated, ${calibration.deviceClass}` : "card calibration"})`}
                />
                <Row k="Scoring" v="Letter-by-letter, 5 per line" />
              </dl>
              {!STANDALONE && (
                <div className="mt-3 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="text-sm font-semibold text-clinic-700 underline underline-offset-4"
                  >
                    Print / save as PDF
                  </button>
                </div>
              )}
            </section>

            <p className="text-xs leading-relaxed text-slate-500">{DISCLAIMER}</p>
          </div>
        )}
      </div>
    </Shell>
  );
}

interface EyeProps {
  title: string;
  score: EyeScore;
  mode: TestMode;
  distanceMm: number;
}

function EyeTile({ title, score, mode, distanceMm }: EyeProps) {
  const c = classify(score, mode);
  const d = displayScore(score, distanceMm);
  return (
    <article className="print-card flex flex-col items-start gap-2 rounded-2xl border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-600">{title}</h2>
      <p className="text-4xl font-black tracking-tight tabular-nums">{d.metric}</p>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[c.severity]}`}>
        {c.label}
      </span>
    </article>
  );
}

function EyeDetail({ title, score, mode, distanceMm }: EyeProps) {
  const c = classify(score, mode);
  const d = displayScore(score, distanceMm);
  return (
    <article className="print-card rounded-2xl border border-slate-200 p-4 text-sm">
      <h3 className="font-bold">{title}</h3>
      <p className="text-slate-600">{c.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
        <Row k="Snellen (m)" v={d.metric} />
        <Row k="Snellen (ft)" v={d.imperial} />
        <Row k="Decimal" v={d.decimal} />
        <Row k="LogMAR" v={d.logMAR} />
        {mode === "near" && <Row k="M-units" v={d.mUnits} />}
      </dl>
      {d.note && <p className="mt-2 text-xs text-slate-500">{d.note}</p>}
      <table className="mt-3 w-full text-left text-xs tabular-nums">
        <thead className="text-slate-500">
          <tr>
            <th className="py-1 font-medium">Line (LogMAR)</th>
            <th className="py-1 font-medium">Snellen</th>
            <th className="py-1 font-medium">Correct</th>
          </tr>
        </thead>
        <tbody>
          {score.lines.map((l) => (
            <tr key={l.logMAR} className="border-t border-slate-100">
              <td className="py-1">{formatLogMAR(l.logMAR)}</td>
              <td className="py-1">{toNotations(l.logMAR).snellenMetric}</td>
              <td className="py-1">
                {l.correct}/{l.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-900">{v}</dd>
    </>
  );
}
