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
      className="bg-white border border-[#e0dcd4] border-l-[3px] px-[18px] py-4 my-4 animate-[slideIn_0.2s_ease-out]"
      style={{ borderLeftColor: accent }}
    >
      <div className="font-heading text-[15px] font-bold text-[#111] mb-1">You keep reading about {entityKey}</div>
      <div className="text-[13px] text-[#666] leading-[1.55] mb-[14px] font-light">
        Want us to go deeper — more coverage, more angles?
      </div>

      {!customOpen ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="font-mono text-[10px] tracking-[0.12em] px-[14px] py-[7px] uppercase text-[#f5f2ed] transition-opacity hover:opacity-80"
            style={{ background: accent }}
            onClick={onYes}
          >
            Yes, more {entityKey}
          </button>
          <button
            type="button"
            className="font-mono text-[10px] tracking-[0.12em] px-[14px] py-[7px] uppercase bg-transparent border border-[#ccc] text-[#666] hover:border-[#888]"
            onClick={() => setCustomOpen(true)}
          >
            Customise →
          </button>
          <button
            type="button"
            className="font-mono text-[10px] tracking-[0.12em] px-[14px] py-[7px] bg-transparent border border-transparent text-[#aaa] hover:text-[#666]"
            onClick={onNo}
          >
            No thanks
          </button>
        </div>
      ) : (
        <div>
          <textarea
            className="w-full min-h-14 px-[14px] py-3 font-sans text-[13px] text-[#111] bg-white border border-[#ddd] resize-y outline-none leading-[1.6] transition-colors focus:border-[#999] placeholder:text-[#bbb] mb-2"
            placeholder='e.g. "Yes but commercial/pricing news only, not product launches"'
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="font-mono text-[10px] tracking-[0.12em] px-[14px] py-[7px] uppercase text-[#f5f2ed] transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: accent }}
              onClick={() => onCustom(customText)}
              disabled={!customText.trim()}
            >
              Save
            </button>
            <button
              type="button"
              className="font-mono text-[10px] tracking-[0.12em] px-[14px] py-[7px] bg-transparent border border-transparent text-[#aaa] hover:text-[#666]"
              onClick={onNo}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="font-mono text-[9px] text-[#bbb] tracking-[0.08em] mt-[10px] leading-[1.6]">
        We add more {entityKey} coverage across multiple sources and angles — not just one perspective.
      </div>
    </div>
  );
}

