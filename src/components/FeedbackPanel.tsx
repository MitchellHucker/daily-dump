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
      ? "bg-[#f0fff4] border-[#a8d8b8] text-[#2a6a3a]"
      : variant === "add"
        ? "bg-[#f0f4ff] border-[#a8b8e8] text-[#2a3a6a]"
        : variant === "depth"
          ? "bg-[#fff8f0] border-[#e8cca8] text-[#6a3a2a]"
          : "bg-[#fff0f0] border-[#e8a8a8] text-[#6a2a2a]";

  return (
    <div className="mb-3">
      <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-[#bbb] mb-[6px]">{label}</div>
      <div className="flex flex-wrap gap-[6px]">
        {items.map((t, i) => (
          <span key={i} className={["text-xs px-[10px] py-1 border rounded-[2px]", pillClasses].join(" ")}>
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
    <div className="mt-10 border-t-2 border-[#111] pt-5">
      <div className="font-heading text-base font-bold text-[#111] mb-1">Tell us what you want to see more of</div>
      <div className="font-mono text-[10px] text-[#999] tracking-[0.08em] mb-[14px]">YOUR FEEDBACK SHAPES TOMORROW&apos;S BRIEF</div>

      <textarea
        className="w-full min-h-20 px-[14px] py-3 font-sans text-[13px] text-[#111] bg-white border border-[#ddd] resize-y outline-none leading-[1.6] transition-colors focus:border-[#999] placeholder:text-[#bbb]"
        placeholder="Anything you liked, missed, or want changed..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={status === "loading"}
      />

      <div className="flex justify-end mt-2">
        <button
          type="button"
          className="font-mono text-[11px] tracking-[0.12em] px-5 py-[10px] bg-[#111] text-[#f5f2ed] border-b-[3px] transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderBottomColor: profile.accent }}
          onClick={submit}
          disabled={!text.trim() || status === "loading"}
        >
          {status === "loading" ? "Processing..." : "Save →"}
        </button>
      </div>

      {status === "error" && (
        <div className="mt-3 bg-[#fff8f8] border-l-[3px] border-l-[#cc3333] px-4 py-[14px] font-mono text-[11px] text-[#993333]">
          Couldn&apos;t process. Try again.
        </div>
      )}

      {status === "done" && result && (
        <div className="mt-5 bg-white border border-[#e0dcd4] p-5 animate-[dailyDumpSlideIn_0.2s_ease-out]">
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#999] mb-[14px]">Here&apos;s what we heard</div>

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
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-[#999] mb-1">Tomorrow&apos;s brief</div>
              <div className="text-[13px] text-[#444] leading-[1.6] px-3 py-[10px] border-l-2 border-l-[#111] bg-[#f8f5f0]">
                {result.summary}
              </div>
            </div>
          ) : null}

          <div className="font-mono text-[10px] text-[#bbb] tracking-[0.08em] mt-[14px] text-right">
            APPLIED · NEXT GENERATION REFLECTS THIS
          </div>
        </div>
      )}
    </div>
  );
}

