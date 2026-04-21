"use client";

import { useCallback, useRef } from "react";

type Signal = { expands: number; follows: number };

export function useInteractionTracker() {
  const signals = useRef<Record<string, Signal>>({});
  const nudgesFired = useRef<Set<string>>(new Set());

  const track = useCallback((type: "expand" | "follow", keys: string[]) => {
    keys.forEach((key) => {
      if (!key) return;
      if (!signals.current[key]) signals.current[key] = { expands: 0, follows: 0 };
      if (type === "expand") signals.current[key].expands += 1;
      if (type === "follow") signals.current[key].follows += 1;
    });
  }, []);

  const getNudge = useCallback(() => {
    let topKey: string | null = null;
    let topScore = 0;
    Object.entries(signals.current).forEach(([key, { expands, follows }]) => {
      const score = expands + follows * 3;
      if (score >= 3 && !nudgesFired.current.has(key) && score > topScore) {
        topScore = score;
        topKey = key;
      }
    });
    return topKey;
  }, []);

  const dismissNudge = useCallback((key: string) => {
    nudgesFired.current.add(key);
  }, []);

  return { track, getNudge, dismissNudge };
}

