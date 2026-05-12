"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  createEmptyTopicPreference,
  MAX_ONBOARDING_TOPICS,
  TOPIC_OPTIONS,
} from "@/lib/onboarding";

export default function TopicsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [maxTopics, setMaxTopics] = useState(MAX_ONBOARDING_TOPICS);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileLimits() {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { maxTopics?: number };
      if (!cancelled && typeof data.maxTopics === "number") setMaxTopics(data.maxTopics);
    }

    loadProfileLimits();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTopic = (topicId: string) => {
    setSelected((prev) => {
      if (prev.includes(topicId)) return prev.filter((t) => t !== topicId);
      if (prev.length >= maxTopics) return prev;
      return [...prev, topicId];
    });
  };

  const continueToRefinement = () => {
    if (selected.length === 0) return;
    const draft = selected.map((topicId) => createEmptyTopicPreference(topicId)).filter(Boolean);
    window.sessionStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    router.push("/onboarding/refine?topic=0");
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <OnboardingHeader />

      <section className="mx-auto w-full max-w-[520px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Step 1 of 3 · Topics</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">What do you care about?</h1>
        <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">
          Pick at least 1, up to {maxTopics} to start.{" "}
          <Link href="/onboarding" className="font-medium text-[var(--amber)] underline underline-offset-2 hover:opacity-90">
            Prefer free text setup →
          </Link>
        </p>

        <div className="mb-4 grid grid-cols-3 gap-[6px]">
          {TOPIC_OPTIONS.map((topic) => {
            const isSelected = selected.includes(topic.id);
            const isDimmed = selected.length >= maxTopics && !isSelected;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={[
                  "min-h-11 rounded-[6px] border bg-white px-1 py-[7px] text-center font-mono text-[10px] font-normal transition-colors",
                  isSelected
                    ? "border-[var(--amber)] bg-[var(--amber-bg)] font-medium text-[var(--amber)]"
                    : "border-[var(--rule)] text-[var(--ink-mid)] hover:border-[var(--ink-light)]",
                  isDimmed ? "opacity-35" : "",
                ].join(" ")}
              >
                {topic.label}
              </button>
            );
          })}
        </div>

        <p className="mb-[14px] font-sans text-[11px] font-light text-[var(--ink-light)]">
          <span className="font-medium text-[var(--amber)]">{selected.length} of {maxTopics}</span> selected
          {maxTopics === MAX_ONBOARDING_TOPICS ? " — upgrade for more" : " — dev limit"}
        </p>

        <button
          type="button"
          disabled={selected.length === 0}
          onClick={continueToRefinement}
          className="block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>

        <p className={["mt-2 text-center font-sans text-[10px] font-light italic text-[var(--ink-ghost)] transition-opacity", selected.length ? "opacity-0" : "opacity-100"].join(" ")}>
          Select at least one topic to continue
        </p>
      </section>
    </main>
  );
}

