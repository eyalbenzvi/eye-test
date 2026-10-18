"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState, type AppState } from "@/state/AppState";

/** Redirects to `fallback` once state is hydrated if the prerequisite is not met. */
export function useRequireStep(ok: (s: AppState) => boolean, fallback: string): boolean {
  const { state } = useAppState();
  const router = useRouter();
  const ready = state.hydrated && ok(state);
  useEffect(() => {
    if (state.hydrated && !ok(state)) router.replace(fallback);
  }, [state, ok, fallback, router]);
  return ready;
}
