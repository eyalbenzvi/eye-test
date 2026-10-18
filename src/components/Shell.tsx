import Link from "next/link";
import type { ReactNode } from "react";

const STEPS = [
  { key: "welcome", label: "Welcome", href: "/" },
  { key: "calibrate", label: "Calibrate", href: "/calibrate" },
  { key: "setup", label: "Distance", href: "/setup" },
  { key: "checklist", label: "Checklist", href: "/checklist" },
  { key: "test", label: "Test", href: "/test" },
  { key: "results", label: "Results", href: "/results" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export function Shell({ step, children }: { step: StepKey; children: ReactNode }) {
  const current = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-clinic-900">
            <Logo />
            AcuityCheck
          </Link>
          <nav aria-label="Progress">
            <ol className="flex flex-wrap items-center gap-1 text-xs font-medium sm:text-sm">
              {STEPS.map((s, i) => (
                <li key={s.key} className="flex items-center gap-1">
                  <span
                    aria-current={i === current ? "step" : undefined}
                    className={
                      i === current
                        ? "rounded-full bg-clinic-600 px-2.5 py-1 text-white"
                        : i < current
                          ? "rounded-full bg-clinic-100 px-2.5 py-1 text-clinic-700"
                          : "rounded-full px-2.5 py-1 text-slate-400"
                    }
                  >
                    {i + 1}. {s.label}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 print:hidden">
        For self-screening only. Not a substitute for a professional eye examination.
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="6" fill="#0b5fff" />
      <path d="M8 7h12v3h-9v2.5h9v3h-9V18h9v3H8z" fill="#fff" />
    </svg>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-xl bg-clinic-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-clinic-600/40 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {children}
    </button>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:border-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-clinic-600/40"
    >
      {children}
    </Link>
  );
}

export const DISCLAIMER =
  "This tool is for self-screening purposes only and does not replace a professional examination by a licensed optometrist or ophthalmologist.";

export function Disclaimer() {
  return (
    <div role="note" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Medical disclaimer</p>
      <p className="mt-1">{DISCLAIMER}</p>
    </div>
  );
}
