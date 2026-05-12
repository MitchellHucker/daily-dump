"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import {
  MAX_ONBOARDING_TOPICS,
  ONBOARDING_DRAFT_STORAGE_KEY,
  ONBOARDING_NEEDS_REVIEW_STORAGE_KEY,
  ONBOARDING_OVERVIEW_STORAGE_KEY,
  sanitizeTopicPreferences,
  TOPIC_OPTIONS,
  TOPIC_OPTIONS_BY_ID,
  type ProfileTopicPreference,
} from "@/lib/onboarding";

export default function OnboardingReviewPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<ProfileTopicPreference[] | null>(null);
  const [overview, setOverview] = useState("");
  const [needsBanner, setNeedsBanner] = useState(false);
  const [maxTopics, setMaxTopics] = useState(MAX_ONBOARDING_TOPICS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { maxTopics?: number }) => {
        if (cancelled) return;
        if (typeof data.maxTopics === "number") setMaxTopics(data.maxTopics);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const draftRaw = window.sessionStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
    const overviewRaw = window.sessionStorage.getItem(ONBOARDING_OVERVIEW_STORAGE_KEY);
    const reviewFlag = window.sessionStorage.getItem(ONBOARDING_NEEDS_REVIEW_STORAGE_KEY);

    const parsedDraft = draftRaw ? JSON.parse(draftRaw) : null;
    const safe = sanitizeTopicPreferences(parsedDraft, TOPIC_OPTIONS.length);
    if (safe.length === 0 || typeof overviewRaw !== "string") {
      router.replace("/onboarding");
      return;
    }
    setTopics(safe);
    setOverview(overviewRaw);
    setNeedsBanner(reviewFlag === "1");
  }, [router]);

  const toggleInterest = (topicIndex: number, interest: string) => {
    if (!topics) return;
    setTopics((prev) => {
      if (!prev) return prev;
      return prev.map((topic, idx) => {
        if (idx !== topicIndex) return topic;
        const has = topic.interests.includes(interest);
        const nextInts = has ? topic.interests.filter((i) => i !== interest) : [...topic.interests, interest];
        return { ...topic, interests: nextInts };
      });
    });
  };

  const setLens = (topicIndex: number, lens: string) => {
    if (!topics) return;
    setTopics((prev) => (prev ? prev.map((t, i) => (i === topicIndex ? { ...t, lens } : t)) : prev));
  };

  const saveProfile = async () => {
    if (!topics?.length) return;
    const capped = sanitizeTopicPreferences(topics, maxTopics);
    if (!capped.length) {
      setError("Choose at least one valid topic.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: capped, overview }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg = typeof (data as { error?: unknown })?.error === "string" ? String((data as { error?: unknown }).error) : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      window.sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      window.sessionStorage.removeItem(ONBOARDING_OVERVIEW_STORAGE_KEY);
      window.sessionStorage.removeItem(ONBOARDING_NEEDS_REVIEW_STORAGE_KEY);
      router.push("/brief");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIsSaving(false);
    }
  };

  if (!topics) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <OnboardingHeader />
        <section className="mx-auto max-w-[560px] px-5 py-10 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]">
          Loading…
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <OnboardingHeader />

      <section className="mx-auto w-full max-w-[560px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Personalise · Step 2 of 2 · Review</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">Tune your briefing</h1>
        <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">
          Topics below were inferred from what you wrote. Edit interests and lenses however you like.
        </p>

        {needsBanner ? (
          <div className="mb-4 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--amber-bg)] px-[14px] py-3 font-sans text-[12px] leading-[1.55] text-[var(--ink-mid)]">
            We couldn&apos;t read much signal from your first pass — starter topics are prefilled below. Adjust them before you continue.
          </div>
        ) : null}

        <label htmlFor="overview-review" className="mb-[6px] block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--ink-light)]">
          Your narrative (stored as you typed it)
        </label>
        <textarea
          id="overview-review"
          className="mb-6 min-h-[120px] w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-white px-3 py-[10px] font-sans text-[13px] font-light leading-[1.55] text-[var(--ink-mid)] outline-none focus:border-[var(--ink-light)]"
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
        />

        <div className="mb-6 space-y-8">
          {topics.map((topic, topicIndex) => {
            const meta = TOPIC_OPTIONS_BY_ID[topic.id];
            const interests = meta?.interests ?? [];
            return (
              <div key={`${topic.id}-${topicIndex}`} className="rounded-[var(--radius)] border border-[var(--rule)] bg-white p-4">
                <div className="mb-3 font-heading text-[17px] font-bold tracking-[-0.3px] text-[var(--ink)]">{topic.label}</div>
                <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-ghost)]">Interests · pick what matters</div>
                <div className="mb-4 flex flex-wrap gap-[6px]">
                  {interests.map((interest) => {
                    const sel = topic.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(topicIndex, interest)}
                        className={[
                          "min-h-11 rounded-full border px-4 py-[7px] font-mono text-[11px] transition-colors",
                          sel
                            ? "border-[var(--amber)] bg-[var(--amber-bg)] font-medium text-[var(--amber)]"
                            : "border-[var(--rule)] bg-[var(--bg)] text-[var(--ink-mid)] hover:border-[var(--ink-light)]",
                        ].join(" ")}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
                <label className="mb-[6px] block font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--ink-light)]">
                  Lens for {topic.label}
                </label>
                <textarea
                  className="min-h-[88px] w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--bg)] px-3 py-[10px] font-sans text-[12px] font-light leading-[1.5] text-[var(--ink-mid)] outline-none placeholder:text-[var(--ink-light)] focus:border-[var(--ink-light)]"
                  placeholder="Angle for this section (lens)"
                  value={topic.lens}
                  onChange={(e) => setLens(topicIndex, e.target.value)}
                />
              </div>
            );
          })}
        </div>

        {error ? (
          <div className="mb-3 rounded-[var(--radius)] border border-[#eed0c7] border-l-2 border-l-[#cc3333] bg-[#fff8f6] px-4 py-[12px] font-sans text-[12px] leading-[1.5] text-[#993333]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={isSaving}
          onClick={saveProfile}
          className="mb-4 block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving…" : "Save & open my brief →"}
        </button>

        <div className="text-center font-sans text-[11px] font-light">
          <Link href="/onboarding/topics" className="text-[var(--ink-mid)] underline underline-offset-2 hover:text-[var(--amber)]">
            Start over with manual topic picker →
          </Link>
        </div>
      </section>
    </main>
  );
}
