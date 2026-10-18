"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DISCLAIMER, Shell } from "@/components/Shell";
import { useAppState } from "@/state/AppState";

const TIPS = [
  {
    title: "Hold the phone 40 cm away",
    body: "About the length from your elbow to your fingertips. Keep it there; don't bring it closer.",
  },
  { title: "Bright room, bright screen", body: "Turn screen brightness up and switch off night / blue-light mode." },
  { title: "Glasses on", body: "Wear your reading glasses if you normally use them." },
];

export default function StartPage() {
  const { state, startTest } = useAppState();
  const router = useRouter();

  return (
    <Shell>
      <div className="flex flex-col gap-7">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quick eye test</h1>
          <p className="text-lg text-slate-600">
            Checks how sharply each eye sees up close. About 3 minutes, one eye at a time.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {TIPS.map((t) => (
            <li key={t.title} className="rounded-2xl bg-slate-100 p-4">
              <p className="font-semibold text-slate-900">{t.title}</p>
              <p className="text-sm text-slate-600">{t.body}</p>
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={!state.hydrated}
          onClick={() => {
            startTest();
            router.push("/test");
          }}
          className="w-full rounded-2xl bg-clinic-600 py-5 text-xl font-bold text-white shadow-sm hover:bg-clinic-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-clinic-600/40 disabled:bg-slate-300"
        >
          Start
        </button>

        <p className="text-xs leading-relaxed text-slate-500">{DISCLAIMER}</p>
        <p className="text-xs text-slate-500">
          Symbol sizes are estimated from your device type.{" "}
          <Link href="/calibrate" className="font-semibold text-clinic-700 underline underline-offset-2">
            {state.calibration ? "Card calibration saved · redo" : "More precise: calibrate with a bank card"}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
