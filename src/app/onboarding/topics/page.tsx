"use client";

import Link from "next/link";
import { useState } from "react";

const TOPICS = [
  "Technology",
  "Politics",
  "Finance",
  "Science",
  "Law",
  "Geopolitics",
  "Environment",
  "Education",
  "Business",
  "Health",
  "Sport",
  "Defence",
  "Energy",
  "Media",
  "Property",
  "Space",
];

export default function TopicsPage() {
  const [selected, setSelected] = useState<string[]>(["Technology", "Finance", "Geopolitics"]);

  const toggleTopic = (topic: string) => {
    setSelected((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      if (prev.length >= 3) return prev;
      return [...prev, topic];
    });
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </div>
      </header>

      <section className="mx-auto w-full max-w-[520px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Step 1 of 2 · Topics</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">What do you care about?</h1>
        <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">Pick at least 1, up to 3 to start.</p>

        <div className="mb-4 grid grid-cols-3 gap-[6px]">
          {TOPICS.map((topic) => {
            const isSelected = selected.includes(topic);
            const isDimmed = selected.length >= 3 && !isSelected;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={[
                  "min-h-11 rounded-[6px] border bg-white px-1 py-[7px] text-center font-mono text-[10px] font-normal transition-colors",
                  isSelected
                    ? "border-[var(--amber)] bg-[var(--amber-bg)] font-medium text-[var(--amber)]"
                    : "border-[var(--rule)] text-[var(--ink-mid)] hover:border-[var(--ink-light)]",
                  isDimmed ? "opacity-35" : "",
                ].join(" ")}
              >
                {topic}
              </button>
            );
          })}
        </div>

        <p className="mb-[14px] font-sans text-[11px] font-light text-[var(--ink-light)]">
          <span className="font-medium text-[var(--amber)]">{selected.length} of 3</span> selected — upgrade for more
        </p>

        <Link
          href="/onboarding/refine"
          className="block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Next →
        </Link>

        <p className={["mt-2 text-center font-sans text-[10px] font-light italic text-[var(--ink-ghost)] transition-opacity", selected.length ? "opacity-0" : "opacity-100"].join(" ")}>
          Select at least one topic to continue
        </p>
      </section>
    </main>
  );
}

