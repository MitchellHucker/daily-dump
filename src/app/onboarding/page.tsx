"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  ONBOARDING_NEEDS_REVIEW_STORAGE_KEY,
  ONBOARDING_OVERVIEW_STORAGE_KEY,
} from "@/lib/onboarding";

export default function OnboardingFreeTextPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overview: text }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof (data as { error?: unknown })?.error === "string" ? String((data as { error?: unknown }).error) : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const parsed = data as { topics?: unknown; needsReview?: unknown };
      if (!Array.isArray(parsed.topics)) throw new Error("Invalid response from server.");
      window.sessionStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(parsed.topics));
      window.sessionStorage.setItem(ONBOARDING_OVERVIEW_STORAGE_KEY, text);
      window.sessionStorage.setItem(ONBOARDING_NEEDS_REVIEW_STORAGE_KEY, parsed.needsReview ? "1" : "0");
      router.push("/onboarding/review");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <OnboardingHeader />

      <section className="mx-auto w-full max-w-[560px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Personalise · Step 1 of 2</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">Tell us about yourself</h1>
        <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">
          Your job, interests, geography, what you want to stay ahead of — the more colour, the better your first Dump.
        </p>

        <textarea
          className="mb-4 min-h-[220px] w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-white px-[14px] py-3 font-sans text-[14px] leading-[1.6] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-ghost)] focus:border-[var(--ink-light)] disabled:opacity-45"
          placeholder="Example: PM at a LegalTech startup in London, relocating to Australia. Care about AI governance, sterling moves, AU visa policy, rugby when there is time..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        {err ? (
          <div className="mb-3 rounded-[var(--radius)] border border-[#eed0c7] border-l-2 border-l-[#cc3333] bg-[#fff8f6] px-4 py-[12px] font-sans text-[12px] leading-[1.5] text-[#993333]">
            {err}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!text.trim() || loading}
          onClick={submit}
          className="mb-4 block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Reading…" : "Draft my topics →"}
        </button>

        <div className="text-center font-sans text-[12px] font-light text-[var(--ink-light)]">
          <Link href="/onboarding/topics" className="text-[var(--ink-mid)] underline underline-offset-2 hover:text-[var(--amber)]">
            I&apos;d rather choose topics myself →
          </Link>
        </div>
      </section>
    </main>
  );
}
