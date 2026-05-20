"use client";

import { useMemo, useState } from "react";
import type { Story } from "../lib/types";

type StoryCardProps = {
  story: Story;
  accent: string;
  disableExpand?: boolean;
  /** Expand works; hide follow/entities and do not call interaction handlers (general headlines). */
  suppressInteractions?: boolean;
  secondaryCollapsed?: boolean;
  onExpand?: (entities: string[]) => void;
  onFollow?: (entities: string[]) => void;
  onTrackEntity?: (entity: string) => void;
  trackedEntities?: Set<string>;
};

export function StoryCard({
  story,
  accent,
  disableExpand = false,
  suppressInteractions = false,
  secondaryCollapsed = false,
  onExpand,
  onFollow,
  onTrackEntity,
  trackedEntities = new Set(),
}: StoryCardProps) {
  const [open, setOpen] = useState(false);
  const [followed, setFollowed] = useState(false);

  const entities = story.entities ?? [];

  const sourceDateLabel = useMemo(() => {
    const iso = story.sourceDate ?? "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return "";
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return "";

    const dt = new Date(Date.UTC(year, month - 1, day));
    const monthName = new Intl.DateTimeFormat(undefined, { month: "long", timeZone: "UTC" }).format(dt);
    return `${day} ${monthName}`;
  }, [story.sourceDate]);

  const handleExpand = () => {
    if (disableExpand) return;
    const next = !open;
    setOpen(next);
    if (next && !suppressInteractions) onExpand?.(entities);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableExpand || suppressInteractions || followed) return;
    setFollowed(true);
    onFollow?.(entities);
  };

  const { takeLabel, takeText, sourceName } = useMemo(() => {
    const take = story.take ?? "";
    const colonIdx = take.indexOf(":");
    const label = colonIdx > -1 ? take.slice(0, colonIdx) : "";
    const text = colonIdx > -1 ? take.slice(colonIdx + 1).trim() : take;
    const srcName = (story.source ?? "").split(",")[0]?.trim() ?? "";
    return { takeLabel: label, takeText: text, sourceName: srcName };
  }, [story.source, story.take]);

  if (disableExpand) {
    return (
      <div className="overflow-hidden border-b border-[#edeae4] last:border-b-0">
        <div className="flex items-start gap-2 py-[9px]">
          <div className="min-w-0 flex-1">
            <div className="mb-[2px] font-sans text-[13px] font-semibold leading-[1.35] tracking-[-0.1px] text-[var(--ink)]">
              {story.headline}
            </div>
            <div className="font-sans text-[12px] font-light leading-[1.45] text-[var(--ink-light)]">{story.snap}</div>
            {story.sourceUrl ? (
              <a
                href={story.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-[4px] inline-block font-sans text-[10px] text-[var(--amber)] underline decoration-[rgba(196,113,42,0.4)] underline-offset-[2px] hover:text-[var(--ink)]"
              >
                {story.source}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={["overflow-hidden border-b border-[#edeae4]", secondaryCollapsed && !open ? "opacity-70" : ""].filter(Boolean).join(" ")}>
      <div className="group flex cursor-pointer select-none items-start gap-2 py-[9px]" onClick={handleExpand}>
        <div className="min-w-0 flex-1">
          <div
            data-story-headline
            className={[
              "mb-[2px] leading-[1.35] transition-opacity group-hover:opacity-70",
              open
                ? "font-sans text-[16px] font-bold tracking-[-0.15px] text-[var(--ink)]"
                : ["font-sans font-semibold tracking-[-0.1px] text-[var(--ink)]", secondaryCollapsed ? "text-[12px]" : "text-[13px]"].join(" "),
            ].join(" ")}
          >
            {story.headline}
          </div>
          <div className={["font-sans text-[12px] leading-[1.45] font-light", open ? "text-[#888]" : "text-[var(--ink-light)]"].join(" ")}>
            {story.snap}
          </div>
        </div>
        <div
          className={[
            "mt-[1px] shrink-0 font-mono text-[14px] text-[#d4cfc8] transition-colors duration-200",
            open ? "text-[var(--ink-light)]" : "",
          ].join(" ")}
        >
          {open ? "×" : "+"}
        </div>
      </div>

      {open && (
        <div className="animate-[dailyDumpSlideIn_0.18s_ease-out] pb-[9px]">
          {!suppressInteractions && entities.length > 0 && (
            <div className="mb-[7px] flex flex-wrap gap-[3px]">
              {entities.map((entity) => {
                const isTracked = trackedEntities.has(entity);
                return (
                  <button
                    key={entity}
                    type="button"
                    className={[
                      "rounded-[3px] px-[6px] py-[2px] font-mono text-[8px] transition-colors",
                      isTracked
                        ? "bg-[var(--amber-bg)] text-[var(--amber)]"
                        : "bg-[#eeeae2] text-[#aaa] hover:bg-[#e8e4dc] hover:text-[var(--ink-mid)]",
                    ].join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackEntity?.(entity);
                    }}
                    title="Click to track"
                  >
                    {isTracked ? "✓ " : ""}
                    {entity}
                  </button>
                );
              })}
            </div>
          )}

          {story.detail && <div className="mb-[7px] font-sans text-[12px] font-light leading-[1.62] text-[var(--ink-mid)]">{story.detail}</div>}

          {takeText && (
            <div
              className="mb-[7px] block border-l-2 bg-[var(--amber-bg)] px-2 py-[5px] font-sans text-[11px] font-light leading-[1.5] text-[#555]"
              style={{ borderLeftColor: accent }}
            >
              {takeLabel && (
                <span className="mb-[2px] block font-mono text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  {takeLabel}
                </span>
              )}
              {takeText}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {story.source && (
              <div className="font-sans text-[10px] text-[var(--amber)]">
                {story.sourceUrl ? (
                  <a
                    href={story.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-[rgba(196,113,42,0.4)] underline-offset-[2px] hover:text-[var(--ink)]"
                    onClick={(e) => e.stopPropagation()}
                    title={story.sourceUrl}
                  >
                    {story.source}
                  </a>
                ) : (
                  story.source
                )}
                {suppressInteractions && story.origin ? (
                  <span className="ml-[3px] font-mono text-[9px] text-[var(--ink-ghost)]">· {story.origin}</span>
                ) : null}
                {sourceDateLabel ? <span className="ml-[3px] font-mono text-[9px] text-[var(--ink-ghost)]">· {sourceDateLabel}</span> : null}
              </div>
            )}
            {sourceName && !suppressInteractions && (
              <button
                type="button"
                onClick={handleFollow}
                className={[
                  "rounded-[3px] border px-[9px] py-[4px] font-mono text-[8px] font-medium uppercase tracking-[0.1em] transition-colors",
                  followed
                    ? "cursor-default border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber)]"
                    : "border-[#ddd] text-[#bbb] hover:border-[var(--ink-light)] hover:text-[var(--ink-mid)]",
                ].join(" ")}
              >
                {followed ? "Following" : `Follow ${sourceName}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
