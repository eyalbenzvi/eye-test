"use client";

import type { Answer } from "@/lib/testEngine";

const ARROW_PATH = "M12 3 L21 13 H15 V21 H9 V13 H3 Z";
const ROTATION: Record<Exclude<Answer, "unsure">, number> = { up: 0, right: 90, down: 180, left: 270 };

function DirButton({ dir, onAnswer, disabled }: { dir: Exclude<Answer, "unsure">; onAnswer: (a: Answer) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAnswer(dir)}
      aria-label={`Points ${dir}`}
      className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-black bg-white text-black active:bg-slate-200 disabled:opacity-40 sm:h-20 sm:w-20"
    >
      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${ROTATION[dir]}deg)` }}>
        <path d={ARROW_PATH} fill="#000" />
      </svg>
    </button>
  );
}

export function DirectionPad({ onAnswer, disabled }: { onAnswer: (a: Answer) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-2" role="group" aria-label="Answer controls">
      <span />
      <DirButton dir="up" onAnswer={onAnswer} disabled={disabled} />
      <span />
      <DirButton dir="left" onAnswer={onAnswer} disabled={disabled} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer("unsure")}
        className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-black bg-black text-sm font-bold uppercase text-white active:bg-slate-700 disabled:opacity-40 sm:h-20 sm:w-20"
      >
        Unsure
      </button>
      <DirButton dir="right" onAnswer={onAnswer} disabled={disabled} />
      <span />
      <DirButton dir="down" onAnswer={onAnswer} disabled={disabled} />
      <span />
    </div>
  );
}
