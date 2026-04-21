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
        <div key={`${sec.id}-${si}`} className="mt-5">
          <div className="flex items-center gap-[6px] pt-[10px] pb-2 border-t border-[#ddd] font-mono text-[10px] tracking-[0.2em] uppercase text-[#999]">
            <span>{sec.icon}</span>
            <span>{sec.label}</span>
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

