"use client";

import type { Brief } from "../lib/stubs";
import { StoryCard } from "./StoryCard";

export function BriefView({
  brief,
  accent,
  onExpand,
  onFollow,
  onTrackEntity,
  trackedEntities,
}: {
  brief: Brief;
  accent: string;
  onExpand: (entities: string[]) => void;
  onFollow: (entities: string[]) => void;
  onTrackEntity: (entity: string) => void;
  trackedEntities: Set<string>;
}) {
  return (
    <div>
      {(brief.sections ?? []).map((sec, si) => (
        <div key={`${sec.id}-${si}`} className={si === 0 ? "" : "mt-4"}>
          <div className="mb-[10px] flex items-center gap-[7px]">
            <span className="font-mono text-[8px] font-medium uppercase tracking-[0.2em] text-[#bbb]">
              {sec.icon} {sec.label}
            </span>
            <span className="h-px flex-1 bg-[var(--rule)]" />
          </div>
          {sec.stories.map((story, i) => (
            <StoryCard
              key={`${sec.id}-${i}`}
              story={story}
              accent={accent}
              onExpand={onExpand}
              onFollow={onFollow}
              onTrackEntity={onTrackEntity}
              trackedEntities={trackedEntities}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

