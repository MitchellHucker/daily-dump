"use client";

import Link from "next/link";
import { useState } from "react";

const INTERESTS = ["AI", "Startups", "LegalTech", "Hardware", "Crypto", "Security"];

export default function RefinePage() {
  const [selected, setSelected] = useState<string[]>(["AI", "LegalTech"]);
  const [lens, setLens] = useState("PM at a LegalTech startup, interested in AI tooling and what's being built...");

  const toggleInterest = (interest: string) => {
    setSelected((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </div>
      </header>

      <section className="mx-auto w-full max-w-[520px] px-5 py-5">
        <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Step 2 of 2 · Refine</div>
        <h1 className="mb-1 font-heading text-[24px] font-bold tracking-[-0.4px]">Technology — topic 1 of 3</h1>
        <p className="mb-3 font-sans text-[13px] font-light text-[var(--ink-light)]">Which areas matter most to you?</p>

        <div className="mb-[14px] flex gap-1">
          <span className="h-[3px] flex-1 rounded-full bg-[var(--amber)]" />
          <span className="h-[3px] flex-1 rounded-full bg-[var(--rule)]" />
          <span className="h-[3px] flex-1 rounded-full bg-[var(--rule)]" />
        </div>

        <div className="mb-4 flex flex-wrap gap-[6px]">
          {INTERESTS.map((interest) => {
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
          className="mb-[10px] min-h-[96px] w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-white px-3 py-[10px] font-sans text-[12px] font-light leading-[1.5] text-[var(--ink-mid)] outline-none placeholder:text-[var(--ink-light)] focus:border-[var(--ink-light)]"
        />

        <Link
          href="/brief"
          className="mb-[7px] block min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-[11px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Next topic →
        </Link>
        <Link
          href="/brief"
          className="block min-h-11 w-full rounded-[var(--radius)] border border-[var(--rule)] bg-transparent px-4 py-[10px] text-center font-mono text-[11px] font-normal tracking-[0.02em] text-[var(--ink-light)] transition-colors hover:border-[var(--ink-light)] hover:text-[var(--ink-mid)]"
        >
          Skip, use defaults →
        </Link>
      </section>
    </main>
  );
}

