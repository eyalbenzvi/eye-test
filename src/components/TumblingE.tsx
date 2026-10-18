"use client";

import { useLayoutEffect, useRef } from "react";
import type { Direction } from "@/lib/testEngine";
import { CROWDED_EXTENT_RATIO, CROWDING_BAR_RATIO, CROWDING_GAP_RATIO } from "@/lib/rendering";

/**
 * Tumbling E on a 5×5 grid: every stroke and gap is exactly one unit (1/5 of
 * the height), so the stroke subtends 1′ of arc when the full E subtends 5′.
 * Base glyph opens to the right; other directions are exact 90° rotations of
 * the integer coordinates, so edges always remain axis-aligned.
 */
const BASE_POINTS: ReadonlyArray<[number, number]> = [
  [0, 0], [5, 0], [5, 1], [1, 1], [1, 2], [5, 2], [5, 3], [1, 3], [1, 4], [5, 4], [5, 5], [0, 5],
];

function rotate([x, y]: [number, number], quarterTurns: number): [number, number] {
  let px = x, py = y;
  for (let i = 0; i < quarterTurns; i++) {
    // 90° clockwise about the centre (2.5, 2.5) in screen coordinates.
    [px, py] = [5 - py, px];
  }
  return [px, py];
}

const TURNS: Record<Direction, number> = { right: 0, down: 1, left: 2, up: 3 };

export const E_PATHS: Record<Direction, string> = Object.fromEntries(
  (Object.keys(TURNS) as Direction[]).map((d) => [
    d,
    "M" + BASE_POINTS.map((p) => rotate(p, TURNS[d]).join(" ")).join("L") + "Z",
  ]),
) as Record<Direction, string>;

interface TumblingEProps {
  direction: Direction;
  /** Optotype height in CSS px (already derived from the physical calibration). */
  sizePx: number;
  crowding?: boolean;
  /** When the stroke unit maps to whole device pixels, render with crisp edges. */
  pixelAligned?: boolean;
}

export function TumblingE({ direction, sizePx, crowding = false, pixelAligned = false }: TumblingEProps) {
  const ref = useRef<SVGSVGElement>(null);

  // Nudge the element onto the device-pixel grid so pixel-aligned strokes stay razor sharp.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    if (!pixelAligned) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = el.getBoundingClientRect();
    const dx = (Math.round(rect.left * dpr) - rect.left * dpr) / dpr;
    const dy = (Math.round(rect.top * dpr) - rect.top * dpr) / dpr;
    if (dx || dy) el.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  const g = CROWDING_GAP_RATIO * 5;
  const b = CROWDING_BAR_RATIO * 5;
  const pad = crowding ? g + b : 0;
  const extent = crowding ? 5 * CROWDED_EXTENT_RATIO : 5;
  const px = crowding ? sizePx * CROWDED_EXTENT_RATIO : sizePx;

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={`Letter E pointing ${direction}`}
      width={px}
      height={px}
      viewBox={`${-pad} ${-pad} ${extent} ${extent}`}
      shapeRendering={pixelAligned ? "crispEdges" : "geometricPrecision"}
      style={{ display: "block", transition: "none", animation: "none" }}
    >
      <path d={E_PATHS[direction]} fill="#000000" />
      {crowding && (
        <g fill="#000000">
          <rect x={0} y={-g - b} width={5} height={b} />
          <rect x={0} y={5 + g} width={5} height={b} />
          <rect x={-g - b} y={0} width={b} height={5} />
          <rect x={5 + g} y={0} width={b} height={5} />
        </g>
      )}
    </svg>
  );
}
