"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Disclaimer, PrimaryButton, Shell } from "@/components/Shell";
import { useAppState } from "@/state/AppState";

const STEPS = [
  {
    title: "Calibrate your screen",
    body: "Hold a standard bank card against the screen and resize an outline until it matches. This gives exact physical sizing on any device.",
  },
  {
    title: "Set up your space",
    body: "Test near vision with the phone in your hand at 30–40 cm, or distance vision from 2–3 m. Set brightness to maximum in a well-lit room.",
  },
  {
    title: "Test each eye",
    body: "Cover one eye at a time and report which way the letter E points: tap or swipe on the screen, or use the arrow keys.",
  },
  {
    title: "Review your results",
    body: "See your acuity in LogMAR, decimal and Snellen notation for each eye, with guidance on next steps and a printable report.",
  },
];

export default function WelcomePage() {
  const { state, acceptDisclaimer } = useAppState();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const accepted = agreed || state.disclaimerAccepted;

  return (
    <Shell step="welcome">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-clinic-600">
            Distance visual acuity self-screening
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Check how sharply each eye sees, up close or across the room, accurately and at home.
          </h1>
          <p className="text-lg text-slate-600">
            AcuityCheck uses a physically calibrated Tumbling&nbsp;E chart, sized with the same optics formulas used
            in clinical LogMAR charts, to give you an indicative visual acuity score for each eye.
          </p>
          <Disclaimer />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-clinic-600"
            />
            <span className="text-sm text-slate-700">
              I understand that this is a screening tool only, and that the result is indicative and not a diagnosis.
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <PrimaryButton
              disabled={!accepted}
              onClick={() => {
                acceptDisclaimer();
                router.push("/calibrate");
              }}
            >
              Begin setup
            </PrimaryButton>
            <span className="text-sm text-slate-500">Takes about 5 minutes. You will need a bank / ID card.</span>
          </div>
        </div>

        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-clinic-600 font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">{s.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}
