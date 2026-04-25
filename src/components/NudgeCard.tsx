"use client";

import { useState } from "react";

export function NudgeCard({
  entityKey,
  accent,
  onYes,
  onCustom,
  onNo,
}: {
  entityKey: string;
  accent: string;
  onYes: () => void;
  onCustom: (text: string) => void;
  onNo: () => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  return (
    <div
      className="my-4 animate-[dailyDumpSlideIn_0.2s_ease-out] rounded-[var(--radius)] border border-[var(--rule)] border-l-2 bg-[var(--amber-bg)] px-[18px] py-4"
      style={{ borderLeftColor: accent }}
    >
      <div className="mb-1 font-heading text-[16px] font-bold tracking-[-0.25px] text-[var(--ink)]">You keep reading about {entityKey}</div>
      <div className="mb-[14px] font-sans text-[13px] font-light leading-[1.55] text-[var(--ink-mid)]">
        Want us to go deeper — more coverage, more angles?
      </div>

      {!customOpen ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius)] bg-[var(--ink)] px-[14px] py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--bg)] transition-opacity hover:opacity-90"
            onClick={onYes}
          >
            Yes, more {entityKey}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius)] border border-[var(--rule)] bg-white/70 px-[14px] py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-mid)] transition-colors hover:border-[var(--ink-light)]"
            onClick={() => setCustomOpen(true)}
          >
            Customise →
          </button>
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius)] border border-transparent bg-transparent px-[14px] py-[8px] font-mono text-[10px] tracking-[0.12em] text-[var(--ink-light)] hover:text-[var(--ink-mid)]"
            onClick={onNo}
          >
            No thanks
          </button>
        </div>
      ) : (
        <div>
          <textarea
            className="mb-2 min-h-20 w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-white px-[14px] py-3 font-sans text-[13px] leading-[1.6] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-ghost)] focus:border-[var(--ink-light)]"
            placeholder='e.g. "Yes but commercial/pricing news only, not product launches"'
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-[var(--radius)] bg-[var(--ink)] px-[14px] py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              onClick={() => onCustom(customText)}
              disabled={!customText.trim()}
            >
              Save
            </button>
            <button
              type="button"
              className="min-h-11 rounded-[var(--radius)] border border-transparent bg-transparent px-[14px] py-[8px] font-mono text-[10px] tracking-[0.12em] text-[var(--ink-light)] hover:text-[var(--ink-mid)]"
              onClick={onNo}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-[10px] font-mono text-[9px] leading-[1.6] tracking-[0.08em] text-[var(--ink-ghost)]">
        We add more {entityKey} coverage across multiple sources and angles — not just one perspective.
      </div>
    </div>
  );
}

