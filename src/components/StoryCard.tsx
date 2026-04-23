"use client";

import { useMemo, useState } from "react";
import type { Story } from "../lib/stubs";

export function StoryCard({
  story,
  accent,
  onExpand,
  onFollow,
  onTrackEntity,
  trackedEntities,
}: {
  story: Story;
  accent: string;
  onExpand: (entities: string[]) => void;
  onFollow: (entities: string[]) => void;
  onTrackEntity: (entity: string) => void;
  trackedEntities: Set<string>;
}) {
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

    // Use UTC to avoid timezone shifting the day.
    const dt = new Date(Date.UTC(year, month - 1, day));
    const monthName = new Intl.DateTimeFormat(undefined, { month: "long", timeZone: "UTC" }).format(dt);
    return `${day} ${monthName}`;
  }, [story.sourceDate]);

  const handleExpand = () => {
    const next = !open;
    setOpen(next);
    if (next) onExpand(entities);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (followed) return;
    setFollowed(true);
    onFollow(entities);
  };

  const { takeLabel, takeText, sourceName } = useMemo(() => {
    const take = story.take ?? "";
    const colonIdx = take.indexOf(":");
    const label = colonIdx > -1 ? take.slice(0, colonIdx) : "";
    const text = colonIdx > -1 ? take.slice(colonIdx + 1).trim() : take;
    const srcName = (story.source ?? "").split(",")[0]?.trim() ?? "";
    return { takeLabel: label, takeText: text, sourceName: srcName };
  }, [story.source, story.take]);

  return (
    <div className="border-b border-[#e8e4dc] overflow-hidden">
      <div className="flex items-start gap-[10px] py-[11px] cursor-pointer select-none group" onClick={handleExpand}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#111] leading-[1.35] mb-[3px] transition-opacity group-hover:opacity-70">
            {story.headline}
          </div>
          <div className="text-[13px] text-[#666] leading-[1.5] font-light">{story.snap}</div>
        </div>
        <div
          className={[
            "shrink-0 mt-[2px] font-mono text-sm text-[#bbb] transition-transform duration-200",
            open ? "rotate-45 text-[#777]" : "",
          ].join(" ")}
        >
          +
        </div>
      </div>

      {open && (
        <div className="pb-[14px] animate-[dailyDumpSlideIn_0.18s_ease-out]">
          {entities.length > 0 && (
            <div className="flex flex-wrap gap-[6px] mb-2">
              {entities.map((entity) => {
                const isTracked = trackedEntities.has(entity);
                return (
                  <button
                    key={entity}
                    type="button"
                    className={[
                      "font-mono text-[9px] px-[7px] py-[2px] border rounded-[2px] transition-colors",
                      isTracked
                        ? "bg-[#f0f4ff] border-[#a8b8e8] text-[#2a3a8a]"
                        : "bg-[#f0ece4] border-[#e0dcd4] text-[#888] hover:bg-[#e8e4dc] hover:text-[#444]",
                    ].join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackEntity(entity);
                    }}
                    title="Click to track"
                  >
                    {isTracked ? "✓ " : "# "}
                    {entity}
                  </button>
                );
              })}
            </div>
          )}

          {story.detail && <div className="text-[13px] text-[#555] leading-[1.65] font-light mb-[10px]">{story.detail}</div>}

          {takeText && (
            <div
              className="block text-xs leading-[1.5] text-[#333] px-[10px] py-[6px] mb-[10px] bg-[rgba(0,0,0,0.03)] border-l-2"
              style={{ borderLeftColor: accent }}
            >
              {takeLabel && (
                <span className="block font-mono text-[9px] tracking-[0.12em] uppercase mb-[2px]" style={{ color: accent }}>
                  {takeLabel}
                </span>
              )}
              {takeText}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {story.source && (
              <div className="font-mono text-[10px] text-[#bbb]">
                ↗{" "}
                {story.sourceUrl ? (
                  <a
                    href={story.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-[2px] hover:text-[#888]"
                    onClick={(e) => e.stopPropagation()}
                    title={story.sourceUrl}
                  >
                    {story.source}
                  </a>
                ) : (
                  story.source
                )}
                {sourceDateLabel ? <span className="ml-2 text-[#c2bcb1]">· {sourceDateLabel}</span> : null}
              </div>
            )}
            {sourceName && (
              <button
                type="button"
                onClick={handleFollow}
                className={[
                  "font-mono text-[9px] tracking-[0.12em] uppercase px-[10px] py-1 border transition-colors",
                  followed ? "border-[#4a9a4a] text-[#4a9a4a] bg-[#f0fff0] cursor-default" : "border-[#ddd] text-[#888] hover:border-[#888] hover:text-[#444]",
                ].join(" ")}
              >
                {followed ? "✓ Following" : `Follow ${sourceName}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

