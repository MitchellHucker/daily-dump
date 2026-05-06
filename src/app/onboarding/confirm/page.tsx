"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sanitizeTopicPreferences, TOPIC_OPTIONS, type ProfileTopicPreference } from "@/lib/onboarding";

const DRAFT_STORAGE_KEY = "dailyDumpOnboardingDraft";

export default function ConfirmPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileTopicPreference[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let timeoutId: number | null = null;
    const stored = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    const parsedDraft = stored ? JSON.parse(stored) : null;
    const nextDraft = sanitizeTopicPreferences(parsedDraft, TOPIC_OPTIONS.length);
    if (nextDraft.length === 0) {
      router.replace("/onboarding/topics");
      return;
    }

    timeoutId = window.setTimeout(() => {
      setDraft(nextDraft);
    }, 0);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [router]);

  const saveProfile = async () => {
    if (!draft) return;

    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: draft }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg = typeof (data as { error?: unknown })?.error === "string" ? String((data as { error?: unknown }).error) : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push("/brief");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </div>
      </header>

      <section className="mx-auto w-full max-w-[520px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Step 3 of 3 · Confirm</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">Ready for your first dump?</h1>
        <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">We&apos;ll use these topics to shape your morning brief.</p>

        {!draft ? (
          <div className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]">Loading...</div>
        ) : (
          <div className="mb-5 rounded-[var(--radius)] bg-[#f0ede6] px-[14px] py-3">
            {draft.map((topic, index) => (
              <div key={topic.id} className={index === draft.length - 1 ? "py-[7px]" : "border-b border-[#e8e4dc] py-[7px]"}>
                <div className="font-sans text-[12px] font-medium leading-[1.35] text-[var(--ink-mid)]">{topic.label}</div>
                <div className="mt-1 font-sans text-[10px] font-light leading-[1.5] text-[var(--ink-ghost)]">
                  {topic.interests.length ? topic.interests.join(", ") : "Broad coverage"}
                  {topic.lens ? ` · ${topic.lens}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <div className="mb-3 rounded-[var(--radius)] border border-[#eed0c7] border-l-2 border-l-[#cc3333] bg-[#fff8f6] px-4 py-[12px] font-sans text-[12px] leading-[1.5] text-[#993333]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!draft || isSaving}
          onClick={saveProfile}
          className="block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Generate my brief →"}
        </button>
      </section>
    </main>
  );
}
