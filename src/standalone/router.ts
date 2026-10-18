/**
 * Minimal in-memory router used by the single-file standalone build in place
 * of the Next.js App Router. Mirrors the parts of next/link and
 * next/navigation that the pages use.
 */

import { useSyncExternalStore } from "react";

let path = "/";
const listeners = new Set<() => void>();

export function navigate(to: string) {
  if (to === path) return;
  path = to;
  window.scrollTo(0, 0);
  listeners.forEach((l) => l());
}

export function usePath(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => path,
    () => path,
  );
}
