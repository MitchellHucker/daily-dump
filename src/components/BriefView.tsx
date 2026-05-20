"use client";

import { Fragment, type ReactNode } from "react";
import type { Brief } from "../lib/stubs";
import { StoryCard } from "./StoryCard";

export function BriefView({
  brief,
  accent,
  storyKeyPrefix,
  onExpand,
  onFollow,
  onTrackEntity,
  trackedEntities,
  renderAfterStory,
  secondaryCollapsedStories = false,
}: {
  brief: Brief;
  accent: string;
  /** Prefix so story keys stay unique across latest vs previous dump on one page */
  storyKeyPrefix: string;
  onExpand: (entities: string[], storyKey: string) => void;
  onFollow: (entities: string[], storyKey: string) => void;
  onTrackEntity: (entity: string, storyKey: string) => void;
  trackedEntities: Set<string>;
  renderAfterStory?: (storyKey: string) => ReactNode;
  secondaryCollapsedStories?: boolean;
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
          {sec.stories.map((story, i) => {
            const storyKey = `${storyKeyPrefix}:${sec.id}-${i}`;
            return (
              <Fragment key={storyKey}>
                <StoryCard
                  story={story}
                  accent={accent}
                  onExpand={(entities) => onExpand(entities, storyKey)}
                  onFollow={(entities) => onFollow(entities, storyKey)}
                  onTrackEntity={(entity) => onTrackEntity(entity, storyKey)}
                  trackedEntities={trackedEntities}
                  secondaryCollapsed={secondaryCollapsedStories}
                />
                {renderAfterStory?.(storyKey)}
              </Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}
