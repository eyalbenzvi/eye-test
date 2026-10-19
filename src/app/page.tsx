"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DISCLAIMER, Shell } from "@/components/Shell";
import { describeDistance } from "@/lib/optometry";
import { useAppState } from "@/state/AppState";

/** Everyday way to judge the hand-held and desk distances, in addition to measuring. */
const DISTANCE_HINT: Record<number, string> = {
  400: "That is about the length from your elbow to your fingertips.",
  600: "That is about an outstretched arm with the elbow slightly bent.",
  800: "That is just beyond the fingertips of your outstretched arm.",
};

export default function StartPage() {
  const { state, startTest, plan } = useAppState();
  const router = useRouter();
  if (!plan) return null;

  const distance = describeDistance(plan.distanceMm);
  const far = plan.distanceMm >= 1000;
  const touch = plan.calibration.deviceClass === "iphone" || plan.calibration.deviceClass === "android-phone";
  const blocked = plan.needsCalibration;
  const cardSaved = plan.calibration.method === "card";

  const steps: { title: string; body: ReactNode }[] = [];
  if (blocked || cardSaved) {
    steps.push({
      title: cardSaved ? "Screen calibrated ✓" : "Calibrate your screen",
      body: cardSaved ? (
        <Link href="/calibrate" className="font-semibold text-clinic-700 underline underline-offset-2">
          Calibrate again
        </Link>
      ) : (
        <>
          <p>
            On a computer or tablet the app needs to learn the real size of your screen. It takes a minute with any bank
            card.
          </p>
          <Link
            href="/calibrate"
            className="mt-3 inline-flex rounded-xl bg-clinic-600 px-5 py-3 font-semibold text-white hover:bg-clinic-700"
          >
            Calibrate
          </Link>
        </>
      ),
    });
  }
  steps.push({
    title: blocked
      ? "Sit at the distance shown after calibrating"
      : `Sit exactly ${distance.metricLabel} from the screen`,
    body: blocked ? (
      "The right distance depends on your screen, so it appears here once the screen is calibrated."
    ) : (
      <>
        <p>
          The app cannot see how far away you are, and the result is only correct at this distance. Measure from your
          eyes to the screen with a tape measure or ruler, and keep that distance for the whole test.{" "}
          {DISTANCE_HINT[plan.distanceMm]}
        </p>
        <p className="mt-2">
          {touch
            ? "Answer by tapping the arrows or swiping."
            : far
              ? "From there, answer with the keyboard arrow keys (Space = not sure)."
              : "Answer with the keyboard arrow keys or the mouse."}
        </p>
      </>
    ),
  });
  steps.push({
    title: "Get ready",
    body: "Bright room, screen brightness up, night / blue-light mode off. Wear the glasses you normally use for this distance, if any.",
  });

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quick eye test</h1>
          <p className="text-lg text-slate-600">Checks how sharply each eye sees. About 3 minutes, one eye at a time.</p>
        </header>

        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl bg-slate-100 p-4">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-clinic-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 text-sm text-slate-700">
                <p className="text-base font-semibold text-slate-900">{s.title}</p>
                <div className="mt-1">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          disabled={blocked}
          onClick={() => {
            startTest();
            router.push("/test");
          }}
          className="w-full rounded-2xl bg-clinic-600 py-5 text-xl font-bold text-white shadow-sm hover:bg-clinic-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-clinic-600/40 disabled:bg-slate-300"
        >
          {blocked ? "Calibrate first" : "Start"}
        </button>

        <p className="text-xs leading-relaxed text-slate-500">{DISCLAIMER}</p>
        {!blocked && !cardSaved && state.hydrated && (
          <p className="text-xs text-slate-500">
            Your screen size is estimated from your phone model.{" "}
            <Link href="/calibrate" className="font-semibold text-clinic-700 underline underline-offset-2">
              Calibrate with a bank card
            </Link>{" "}
            for extra precision.
          </p>
        )}
      </div>
    </Shell>
  );
}
