"use client";

import type { ReactNode } from "react";
import type { Brief } from "@/lib/stubs";
import { BriefView } from "./BriefView";

type PreviousDumpSectionProps = {
  brief: Brief;
  generatedAtLabel: string;
  accent?: string;
  onExpand: (entities: string[], storyKey: string) => void;
  onFollow: (entities: string[], storyKey: string) => void;
  onTrackEntity: (entity: string, storyKey: string) => void;
  trackedEntities: Set<string>;
  renderAfterStory?: (storyKey: string) => ReactNode;
  className?: string;
};

export function PreviousDumpSection({
  brief,
  generatedAtLabel,
  accent = "var(--amber)",
  onExpand,
  onFollow,
  onTrackEntity,
  trackedEntities,
  renderAfterStory,
  className = "",
}: PreviousDumpSectionProps) {
  return (
    <section className={className}>
      <div className="mb-4 border-l-2 border-[var(--amber)] pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ink-mid)]">
        Previous dump · {generatedAtLabel}
      </div>
      <div>
        <BriefView
          brief={brief}
          accent={accent}
          storyKeyPrefix="previous"
          onExpand={onExpand}
          onFollow={onFollow}
          onTrackEntity={onTrackEntity}
          trackedEntities={trackedEntities}
          renderAfterStory={renderAfterStory}
          secondaryCollapsedStories
        />
      </div>
    </section>
  );
}
