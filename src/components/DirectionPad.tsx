"use client";

import type { Answer } from "@/lib/testEngine";

const ARROW_PATH = "M12 3 L21 13 H15 V21 H9 V13 H3 Z";
const ROTATION: Record<Exclude<Answer, "unsure">, number> = { up: 0, right: 90, down: 180, left: 270 };

interface ButtonProps {
  dir: Exclude<Answer, "unsure">;
  onAnswer: (a: Answer) => void;
  disabled?: boolean;
  large?: boolean;
}

const SIZE = "h-16 w-16 sm:h-20 sm:w-20";
/** Thumb-sized targets for near tests where the user taps the screen they are reading. */
const SIZE_LARGE = "h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24";

function DirButton({ dir, onAnswer, disabled, large }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAnswer(dir)}
      aria-label={`Points ${dir}`}
      className={`flex ${large ? SIZE_LARGE : SIZE} touch-manipulation items-center justify-center rounded-2xl border-[3px] border-black bg-white text-black active:bg-slate-200 disabled:opacity-40`}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${ROTATION[dir]}deg)` }}>
        <path d={ARROW_PATH} fill="#000" />
      </svg>
    </button>
  );
}

export function DirectionPad({
  onAnswer,
  disabled,
  large = false,
}: {
  onAnswer: (a: Answer) => void;
  disabled?: boolean;
  large?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-2" role="group" aria-label="Answer controls">
      <span />
      <DirButton dir="up" onAnswer={onAnswer} disabled={disabled} large={large} />
      <span />
      <DirButton dir="left" onAnswer={onAnswer} disabled={disabled} large={large} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer("unsure")}
        className={`flex ${large ? SIZE_LARGE : SIZE} touch-manipulation items-center justify-center rounded-2xl border-[3px] border-black bg-black text-sm font-bold uppercase text-white active:bg-slate-700 disabled:opacity-40`}
      >
        Unsure
      </button>
      <DirButton dir="right" onAnswer={onAnswer} disabled={disabled} large={large} />
      <span />
      <DirButton dir="down" onAnswer={onAnswer} disabled={disabled} large={large} />
      <span />
    </div>
  );
}
