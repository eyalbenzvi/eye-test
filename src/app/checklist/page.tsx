"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton, SecondaryLink, Shell } from "@/components/Shell";
import { useRequireStep } from "@/components/useRequireStep";
import { DISTANCE_OPTIONS } from "@/lib/optometry";
import { useAppState, type AppState } from "@/state/AppState";

const needsCalibration = (s: AppState) => s.disclaimerAccepted && s.calibration !== null;

export default function ChecklistPage() {
  const ready = useRequireStep(needsCalibration, "/calibrate");
  const { state, dispatch } = useAppState();
  const router = useRouter();
  const distance = DISTANCE_OPTIONS.find((d) => d.mm === state.distanceMm)!;

  const items = [
    { id: "light", title: "The room is well lit", body: "Even, bright room lighting — avoid testing in the dark." },
    {
      id: "brightness",
      title: "Screen brightness is at maximum",
      body: "Turn off auto-brightness and battery-saver dimming so contrast stays maximal.",
    },
    {
      id: "filters",
      title: "Blue-light / Night Shift / dark mode filters are off",
      body: "Night Shift, Night Light, True Tone, f.lux, reading modes and dark-mode extensions all lower contrast.",
    },
    {
      id: "glare",
      title: "There is no glare or reflection on the screen",
      body: "No window or lamp behind you reflecting on the display, and no bright light directly behind the screen.",
    },
    {
      id: "distance",
      title: `I have measured ${distance.metricLabel} (${distance.imperialLabel}) from the screen`,
      body: "Mark the spot on the floor. The screen should be at eye level and facing you squarely.",
    },
    {
      id: "correction",
      title: "I am wearing my usual distance glasses or contact lenses (if any)",
      body: "To screen your uncorrected vision, remove them — but note this when reading your results.",
    },
    {
      id: "control",
      title: "I can answer from my testing position",
      body: "Use a Bluetooth keyboard, a presenter remote, or ask a helper standing at the screen to press the buttons for you.",
    },
  ];

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!ready) return null;
  const allChecked = items.every((i) => checked[i.id]);

  return (
    <Shell step="checklist">
      <div className="space-y-8">
        <header className="max-w-3xl space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Prepare your environment</h1>
          <p className="text-slate-600">Confirm each item. Testing conditions have a direct effect on your score.</p>
        </header>
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <label
                className={`flex h-full cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                  checked[item.id] ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={(e) => setChecked((c) => ({ ...c, [item.id]: e.target.checked }))}
                  className="mt-0.5 h-5 w-5 flex-none accent-emerald-600"
                />
                <span>
                  <span className="block font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">{item.body}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="max-w-3xl rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
          <p className="font-semibold">Controls during the test</p>
          <p className="mt-1">
            Arrow keys <kbd className="rounded border bg-white px-1">↑</kbd>{" "}
            <kbd className="rounded border bg-white px-1">↓</kbd> <kbd className="rounded border bg-white px-1">←</kbd>{" "}
            <kbd className="rounded border bg-white px-1">→</kbd> answer the direction the E&apos;s bars point.{" "}
            <kbd className="rounded border bg-white px-1">Space</kbd> means &ldquo;unsure&rdquo;. <kbd className="rounded border bg-white px-1">Esc</kbd>{" "}
            pauses. Never squint or lean forward.
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-4">
          <SecondaryLink href="/setup">Back</SecondaryLink>
          <PrimaryButton
            disabled={!allChecked}
            onClick={() => {
              dispatch({ type: "setChecklist", confirmed: true });
              dispatch({ type: "startTest" });
              router.push("/test");
            }}
          >
            Start the test
          </PrimaryButton>
        </div>
      </div>
    </Shell>
  );
}
