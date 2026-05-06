"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { sanitizeTopicPreferences, TOPIC_OPTIONS, TOPIC_OPTIONS_BY_ID, type ProfileTopicPreference } from "@/lib/onboarding";

const DRAFT_STORAGE_KEY = "dailyDumpOnboardingDraft";

export default function RefinePage() {
  return (
    <Suspense fallback={<OnboardingShell>Loading...</OnboardingShell>}>
      <RefineContent />
    </Suspense>
  );
}

function RefineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<ProfileTopicPreference[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [lens, setLens] = useState("");
  const requestedIndex = Number(searchParams.get("topic") ?? "0");
  const currentIndex = Number.isFinite(requestedIndex) && requestedIndex >= 0 ? Math.floor(requestedIndex) : 0;

  useEffect(() => {
    let timeoutId: number | null = null;
    const stored = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    const parsedDraft = stored ? JSON.parse(stored) : null;
    const nextDraft = sanitizeTopicPreferences(parsedDraft, TOPIC_OPTIONS.length);
    if (nextDraft.length === 0) {
      router.replace("/onboarding/topics");
      return;
    }

    const safeIndex = Math.min(currentIndex, nextDraft.length - 1);
    if (safeIndex !== currentIndex) {
      router.replace(`/onboarding/refine?topic=${safeIndex}`);
      return;
    }

    const current = nextDraft[safeIndex];
    timeoutId = window.setTimeout(() => {
      setDraft(nextDraft);
      setSelected(current.interests);
      setLens(current.lens);
    }, 0);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [currentIndex, router]);

  const currentTopic = draft?.[currentIndex] ?? null;
  const topicOption = currentTopic ? TOPIC_OPTIONS_BY_ID[currentTopic.id] : null;
  const interests = topicOption?.interests ?? [];

  const toggleInterest = (interest: string) => {
    setSelected((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  };

  const saveAndContinue = ({ skip = false }: { skip?: boolean } = {}) => {
    if (!draft || !currentTopic) return;

    const nextDraft = draft.map((topic, index) =>
      index === currentIndex
        ? {
            ...topic,
            interests: skip ? [] : selected,
            lens: skip ? "" : lens.trim(),
          }
        : topic,
    );
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));

    const nextIndex = currentIndex + 1;
    if (nextIndex < nextDraft.length) {
      router.push(`/onboarding/refine?topic=${nextIndex}`);
    } else {
      router.push("/onboarding/confirm");
    }
  };

  if (!draft || !currentTopic) {
    return <OnboardingShell>Loading...</OnboardingShell>;
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </div>
      </header>

      <section className="mx-auto w-full max-w-[520px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Step 2 of 3 · Refine</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">{currentTopic.label}</h1>
        <p className="mb-3 font-sans text-[13px] font-light text-[var(--ink-light)]">Which areas matter most to you?</p>
        <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-ghost)]">
          Refining topic {currentIndex + 1} of {draft.length}
        </div>

        <div className="mb-[14px] flex gap-1">
          {draft.map((topic, index) => (
            <span key={topic.id} className={["h-[3px] flex-1 rounded-full", index <= currentIndex ? "bg-[var(--amber)]" : "bg-[var(--rule)]"].join(" ")} />
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-[6px]">
          {interests.map((interest) => {
            const isSelected = selected.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={[
                  "min-h-11 rounded-full border px-4 py-[7px] font-mono text-[11px] font-normal transition-colors",
                  isSelected
                    ? "border-[var(--amber)] bg-[var(--amber-bg)] font-medium text-[var(--amber)]"
                    : "border-[var(--rule)] bg-white text-[var(--ink-mid)] hover:border-[var(--ink-light)]",
                ].join(" ")}
              >
                {interest}
              </button>
            );
          })}
        </div>

        <label htmlFor="lens" className="mb-[6px] block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--ink-light)]">
          Tell us more
        </label>
        <textarea
          id="lens"
          value={lens}
          onChange={(e) => setLens(e.target.value)}
          placeholder={`Anything specific you care about in ${currentTopic.label.toLowerCase()}?`}
          className="mb-[10px] min-h-[96px] w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-white px-3 py-[10px] font-sans text-[12px] font-light leading-[1.5] text-[var(--ink-mid)] outline-none placeholder:text-[var(--ink-light)] focus:border-[var(--ink-light)]"
        />

        <button
          type="button"
          onClick={() => saveAndContinue()}
          className="mb-[7px] block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          {currentIndex + 1 < draft.length ? "Next topic →" : "Review choices →"}
        </button>
        <button
          type="button"
          onClick={() => saveAndContinue({ skip: true })}
          className="block min-h-11 w-full rounded-[var(--radius)] border border-[var(--rule)] bg-transparent px-4 py-[10px] text-center font-mono text-[11px] font-normal tracking-[0.02em] text-[var(--ink-light)] transition-colors hover:border-[var(--ink-light)] hover:text-[var(--ink-mid)]"
        >
          Skip, use defaults →
        </button>
      </section>
    </main>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </div>
      </header>
      <section className="mx-auto w-full max-w-[520px] px-5 py-5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]">
        {children}
      </section>
    </main>
  );
}

