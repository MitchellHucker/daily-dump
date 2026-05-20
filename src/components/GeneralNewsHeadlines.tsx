"use client";

import type { Story } from "@/lib/types";
import { StoryCard } from "./StoryCard";

export function GeneralNewsHeadlines({
  stories,
  loading,
  className = "",
}: {
  stories: Story[];
  loading?: boolean;
  className?: string;
}) {
  if (!loading && stories.length === 0) return null;

  return (
    <section
      className={["rounded-[var(--radius)] bg-[#ede9e3] p-4", className].filter(Boolean).join(" ")}
      aria-label="Today's general headlines"
    >
      <div className="mb-4 border-l-2 border-[var(--amber)] pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--amber)]">
        Today&apos;s headlines
      </div>
      {loading && stories.length === 0 ? (
        <p className="font-sans text-[11px] font-light text-[var(--ink-light)]">Loading headlines…</p>
      ) : (
        <div>
          {stories.map((story, index) => (
            <StoryCard
              key={`${story.headline}-${index}`}
              story={story}
              accent="var(--ink-mid)"
              suppressInteractions
            />
          ))}
        </div>
      )}
    </section>
  );
}
