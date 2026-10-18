import Link from "next/link";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-clinic-900">
            <Logo />
            AcuityCheck
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">{children}</main>
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
