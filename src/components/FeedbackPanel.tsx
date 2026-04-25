"use client";

import { useState } from "react";
import type { Profile } from "../lib/profiles";

type FeedbackExtraction = {
  liked?: string[];
  add_topics?: string[];
  more_depth_on?: string[];
  remove_or_reduce?: string[];
  summary?: string;
};

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

async function extractProfileUpdates(feedbackText: string, profileName: string): Promise<FeedbackExtraction> {
  const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `A user named ${profileName} gave this feedback on their morning news brief:

"${feedbackText}"

Extract structured signals. Return ONLY valid JSON:

{
  "liked": ["brief descriptions of what they responded to positively"],
  "add_topics": ["new topics, vendors, or content types to add"],
  "more_depth_on": ["areas where they want more detail or numbers"],
  "remove_or_reduce": ["anything they want less of"],
  "summary": "One sentence: what changes in their brief tomorrow."
}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  const content = (data as AnthropicResponse)?.content;
  const raw = Array.isArray(content)
    ? content
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("")
    : "";
  const cleaned = String(raw).replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("Could not parse JSON from model output.");
  return JSON.parse(cleaned.slice(s, e + 1));
}

function PillGroup({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: "liked" | "add" | "depth" | "remove";
}) {
  const pillClasses =
    variant === "liked"
      ? "bg-[var(--amber-bg)] text-[var(--amber)]"
      : variant === "add"
        ? "bg-[#eeeae2] text-[var(--ink-mid)]"
        : variant === "depth"
          ? "bg-[#eeeae2] text-[var(--ink-mid)]"
          : "bg-[#f0ede6] text-[var(--ink-light)]";

  return (
    <div className="mb-3">
      <div className="mb-[6px] font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--ink-ghost)]">{label}</div>
      <div className="flex flex-wrap gap-[6px]">
        {items.map((t, i) => (
          <span key={i} className={["rounded-[3px] px-[9px] py-[3px] font-mono text-[9px]", pillClasses].join(" ")}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeedbackPanel({ profile }: { profile: Profile }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<FeedbackExtraction | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setStatus("loading");
    try {
      const parsed = await extractProfileUpdates(text, profile.name);
      setResult(parsed);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mt-10 border-t border-[var(--rule)] pt-5">
      <div className="mb-1 font-heading text-[18px] font-bold tracking-[-0.3px] text-[var(--ink)]">Tell us what you want to see more of</div>
      <div className="mb-[14px] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-ghost)]">Your feedback shapes tomorrow&apos;s brief</div>

      <textarea
        className="min-h-24 w-full resize-y rounded-[var(--radius)] border border-[var(--rule)] bg-white px-[14px] py-3 font-sans text-[13px] leading-[1.6] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-ghost)] focus:border-[var(--ink-light)] disabled:opacity-50"
        placeholder="Anything you liked, missed, or want changed..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={status === "loading"}
      />

      <div className="flex justify-end mt-2">
        <button
          type="button"
          className="min-h-11 rounded-[var(--radius)] bg-[var(--ink)] px-5 py-[10px] font-mono text-[11px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={submit}
          disabled={!text.trim() || status === "loading"}
        >
          {status === "loading" ? "Processing..." : "Save →"}
        </button>
      </div>

      {status === "error" && (
        <div className="mt-3 rounded-[var(--radius)] border border-[#eed0c7] border-l-2 border-l-[#cc3333] bg-[#fff8f6] px-4 py-[14px] font-sans text-[12px] text-[#993333]">
          Couldn&apos;t process. Try again.
        </div>
      )}

      {status === "done" && result && (
        <div className="mt-5 animate-[dailyDumpSlideIn_0.2s_ease-out] rounded-[var(--radius)] border border-[var(--rule)] bg-white p-5">
          <div className="mb-[14px] font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-light)]">Here&apos;s what we heard</div>

          {result.liked?.length ? (
            <PillGroup label="Liked" items={result.liked.map((l) => `✓ ${l}`)} variant="liked" />
          ) : null}
          {result.add_topics?.length ? (
            <PillGroup label="Adding" items={result.add_topics.map((t) => `+ ${t}`)} variant="add" />
          ) : null}
          {result.more_depth_on?.length ? (
            <PillGroup label="Going deeper on" items={result.more_depth_on.map((d) => `↓ ${d}`)} variant="depth" />
          ) : null}
          {result.remove_or_reduce?.length ? (
            <PillGroup label="Reducing" items={result.remove_or_reduce.map((r) => `− ${r}`)} variant="remove" />
          ) : null}

          {result.summary ? (
            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--ink-light)]">Tomorrow&apos;s brief</div>
              <div className="border-l-2 border-l-[var(--amber)] bg-[var(--amber-bg)] px-3 py-[10px] font-sans text-[13px] font-light leading-[1.6] text-[var(--ink-mid)]">
                {result.summary}
              </div>
            </div>
          ) : null}

          <div className="mt-[14px] text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--ink-ghost)]">
            Applied · next generation reflects this
          </div>
        </div>
      )}
    </div>
  );
}

