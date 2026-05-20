"use client";

import { useCallback, useRef } from "react";

type Signal = { expands: number; follows: number };

export type NudgeCandidate = {
  entityKey: string;
  storyKey: string;
};

export function useInteractionTracker() {
  const signals = useRef<Record<string, Signal>>({});
  const nudgesFired = useRef<Set<string>>(new Set());
  /** Last story where the user expanded/followed while that entity was in the signal */
  const lastStoryByEntity = useRef<Record<string, string>>({});

  const track = useCallback((type: "expand" | "follow", keys: string[], storyKey?: string) => {
    keys.forEach((key) => {
      if (!key) return;
      if (!signals.current[key]) signals.current[key] = { expands: 0, follows: 0 };
      if (type === "expand") signals.current[key].expands += 1;
      if (type === "follow") signals.current[key].follows += 1;

      if (storyKey) {
        lastStoryByEntity.current[key] = storyKey;
      }
    });
  }, []);

  const getNudge = useCallback((): NudgeCandidate | null => {
    let topKey: string | null = null;
    let topScore = 0;
    Object.entries(signals.current).forEach(([key, { expands, follows }]) => {
      const score = expands + follows * 3;
      if (score >= 3 && !nudgesFired.current.has(key) && score > topScore) {
        topScore = score;
        topKey = key;
      }
    });

    if (!topKey) return null;
    const storyKey = lastStoryByEntity.current[topKey];
    if (!storyKey) return null;

    return { entityKey: topKey, storyKey };
  }, []);

  const dismissNudge = useCallback((key: string) => {
    nudgesFired.current.add(key);
  }, []);

  /** User answered or dismissed any nudge — no more prompts until reload */
  const markNudgeSessionAnswered = useCallback(() => {
    Object.keys(signals.current).forEach((key) => {
      nudgesFired.current.add(key);
    });
  }, []);

  return { track, getNudge, dismissNudge, markNudgeSessionAnswered };
}
