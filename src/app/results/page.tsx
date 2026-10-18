"use client";

import { useRouter } from "next/navigation";
import { DISCLAIMER, Disclaimer, PrimaryButton, SecondaryLink, Shell } from "@/components/Shell";
import { useRequireStep } from "@/components/useRequireStep";
import {
  INTEROCULAR_SIGNIFICANT,
  URGENT_SYMPTOMS,
  classify,
  interocular,
  recommend,
  type Severity,
  type Urgency,
} from "@/lib/insights";
import { DISTANCE_OPTIONS, formatLogMAR, toNotations } from "@/lib/optometry";
import type { EyeScore } from "@/lib/testEngine";
import { useAppState, type AppState } from "@/state/AppState";

const needsResults = (s: AppState) => !!s.results?.right && !!s.results?.left;

const SEVERITY_STYLE: Record<Severity, string> = {
  normal: "bg-emerald-100 text-emerald-900 border-emerald-300",
  borderline: "bg-lime-100 text-lime-900 border-lime-300",
  mild: "bg-amber-100 text-amber-900 border-amber-300",
  moderate: "bg-orange-100 text-orange-900 border-orange-300",
  severe: "bg-red-100 text-red-900 border-red-300",
};

const URGENCY_STYLE: Record<Urgency, string> = {
  routine: "border-emerald-400 bg-emerald-50 text-emerald-950",
  recommended: "border-amber-400 bg-amber-50 text-amber-950",
  prompt: "border-red-400 bg-red-50 text-red-950",
};

/** Displayed score, clamped to the measured range with an inequality qualifier where needed. */
function displayScore(score: EyeScore) {
  if (score.worseThanRange) {
    const n = toNotations(score.largestLevel);
    return {
      logMAR: `> ${formatLogMAR(score.largestLevel)}`,
      decimal: `< ${n.decimal.toFixed(2)}`,
      metric: `worse than ${n.snellenMetric}`,
      imperial: `worse than ${n.snellenImperial}`,
      note: "Below the largest symbol this screen could display.",
    };
  }
  const n = toNotations(score.logMAR);
  const q = score.betterThanRange ? "≥ " : "";
  return {
    logMAR: `${score.betterThanRange ? "≤ " : ""}${formatLogMAR(n.logMAR)}`,
    decimal: `${q}${n.decimal.toFixed(2)}`,
    metric: `${q}${n.snellenMetric}`,
    imperial: `${q}${n.snellenImperial}`,
    note: score.betterThanRange ? "Read the smallest symbol this screen could display accurately." : null,
  };
}

export default function ResultsPage() {
  const ready = useRequireStep(needsResults, "/");
  const { state } = useAppState();
  const router = useRouter();

  if (!ready || !state.results?.right || !state.results.left) return null;
  const { right, left, calibration, distanceMm, crowding, completedAt, startedAt } = state.results;
  const io = interocular(right, left);
  const rec = recommend(right, left);
  const distance = DISTANCE_OPTIONS.find((d) => d.mm === distanceMm)!;
  const date = new Date(completedAt ?? startedAt);
  const anyReduced = [right, left].some((s) => classify(s).severity !== "normal");

  return (
    <Shell step="results">
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hidden text-sm font-bold uppercase tracking-widest print:block">AcuityCheck</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your visual acuity results</h1>
            <p className="text-slate-600">
              {date.toLocaleDateString(undefined, { dateStyle: "long" })} ·{" "}
              {date.toLocaleTimeString(undefined, { timeStyle: "short" })} · Tested at {distance.metricLabel} (
              {distance.imperialLabel})
            </p>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            <PrimaryButton onClick={() => window.print()}>Print / Save as PDF</PrimaryButton>
          </div>
        </header>

        <section className={`print-card rounded-2xl border-2 p-5 ${URGENCY_STYLE[rec.urgency]}`} aria-live="polite">
          <h2 className="text-lg font-bold">{rec.headline}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {rec.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <EyeCard title="Right eye" abbr="OD" score={right} />
          <EyeCard title="Left eye" abbr="OS" score={left} />
        </section>

        {io.level !== "none" && (
          <section
            className={`print-card rounded-2xl border-2 p-5 ${
              io.level === "significant" ? "border-red-400 bg-red-50 text-red-950" : "border-slate-300 bg-slate-50"
            }`}
          >
            <h2 className="font-bold">
              {io.level === "significant" ? "Interocular discrepancy alert" : "Small difference between eyes"}
            </h2>
            <p className="mt-1 text-sm">
              Your {io.weakerEye} eye scored {io.difference.toFixed(2)} LogMAR worse than your other eye
              {io.level === "significant"
                ? ` — at or above the ${INTEROCULAR_SIGNIFICANT.toFixed(1)} LogMAR (two-line) threshold considered clinically significant. Unequal vision between the eyes can stem from unequal refractive error (anisometropia), astigmatism in one eye, amblyopia, or eye disease, and should be examined.`
                : ". A one-line difference is common and usually not a concern on its own."}
            </p>
          </section>
        )}

        {anyReduced && (
          <section className="print-card rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold">What reduced distance acuity can mean</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>
                <strong>Myopia (nearsightedness):</strong> distant objects appear blurred while near vision is clear. The
                most common reason for reduced distance acuity.
              </li>
              <li>
                <strong>Astigmatism:</strong> an irregularly curved cornea or lens blurs or distorts vision at all
                distances; some directions of the E may seem harder than others.
              </li>
              <li>
                <strong>Other causes:</strong> outdated glasses, cataract, dry eye, or retinal conditions. A screening
                test cannot tell these apart — only a professional exam can.
              </li>
            </ul>
          </section>
        )}

        <section className="grid gap-5 md:grid-cols-2">
          <div className="print-card rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold">Test parameters</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Row k="Test date" v={date.toLocaleString()} />
              <Row k="Viewing distance" v={`${distance.metricLabel} (${distance.imperialLabel})`} />
              <Row k="Optotype" v={`Tumbling E${crowding ? ", crowding bars" : ""}`} />
              <Row k="Screen calibration" v={`${calibration.pxPerMm.toFixed(3)} px/mm`} />
              <Row k="Card match width" v={`${calibration.cardWidthPx.toFixed(1)} CSS px`} />
              <Row k="Device pixel ratio" v={calibration.devicePixelRatio.toFixed(2)} />
              <Row k="Screen" v={`${calibration.screenWidth} × ${calibration.screenHeight}`} />
              <Row k="Calibrated" v={new Date(calibration.calibratedAt).toLocaleString()} />
              <Row k="Scoring" v="Letter-by-letter, 5 per line, 0.02 LogMAR each" />
            </dl>
          </div>
          <div className="print-card rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold">Seek urgent care if you notice</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {URGENT_SYMPTOMS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-slate-600">
              These symptoms need same-day attention from an eye care professional or emergency department, regardless
              of your score here.
            </p>
          </div>
        </section>

        <div className="print:hidden">
          <Disclaimer />
        </div>
        <p className="hidden text-xs print:block">{DISCLAIMER}</p>

        <div className="flex flex-wrap justify-between gap-4 print:hidden">
          <SecondaryLink href="/calibrate">Recalibrate</SecondaryLink>
          <PrimaryButton onClick={() => router.push("/setup")}>Take the test again</PrimaryButton>
        </div>
      </div>
    </Shell>
  );
}

function EyeCard({ title, abbr, score }: { title: string; abbr: string; score: EyeScore }) {
  const c = classify(score);
  const d = displayScore(score);
  return (
    <article className="print-card rounded-2xl border border-slate-200 p-5 shadow-sm">
      <header className="flex flex-wrap-reverse items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {title} <span className="text-sm font-medium text-slate-500">({abbr})</span>
          </h2>
          <p className="text-sm text-slate-600">{c.description}</p>
        </div>
        <span className={`flex-none rounded-full border px-3 py-1 text-xs font-semibold ${SEVERITY_STYLE[c.severity]}`}>
          {c.label}
        </span>
      </header>

      <p
        className={`mt-4 font-black tracking-tight tabular-nums ${d.metric.length > 10 ? "text-3xl" : "text-5xl"}`}
      >
        {d.metric}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="Decimal" value={d.decimal} />
        <Metric label="Snellen (ft)" value={d.imperial} />
        <Metric label="LogMAR" value={d.logMAR} />
      </dl>
      {d.note && <p className="mt-3 text-xs text-slate-500">{d.note}</p>}

      <div className="mt-4 text-sm">
        <h3 className="font-semibold text-slate-700">Line-by-line detail</h3>
        <table className="mt-2 w-full text-left text-xs tabular-nums">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">LogMAR</th>
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
        <p className="mt-2 text-xs text-slate-500">
          Measurable range on this screen: {formatLogMAR(score.largestLevel)} to {formatLogMAR(score.smallestLevel)}.
        </p>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">{label}</dt>
      <dd className="text-sm font-bold sm:text-base">{value}</dd>
    </div>
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
