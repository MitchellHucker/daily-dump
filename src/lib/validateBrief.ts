import type { BriefResponse, Section, Story } from "./types";

const MAX_SNAP_CHARS = 160;
const MAX_ENTITIES = 3;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function urlOrEmpty(v: unknown): string {
  const u = s(v);
  if (!u) return "";
  if (u.startsWith("https://") || u.startsWith("http://")) return u;
  return "";
}

function dateOrEmpty(v: unknown): string {
  const d = s(v);
  if (!d) return "";
  // Strict YYYY-MM-DD only.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return "";
}

function clampSnap(text: string): string {
  if (text.length <= MAX_SNAP_CHARS) return text;
  const trimmed = text.slice(0, MAX_SNAP_CHARS).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > 80 ? trimmed.slice(0, lastSpace) : trimmed) + "…";
}

export function validateBrief(raw: unknown): BriefResponse {
  if (!raw || typeof raw !== "object") throw new Error("Invalid brief structure returned from model.");
  const sectionsRaw = (raw as any).sections;
  if (!Array.isArray(sectionsRaw)) throw new Error("Invalid brief structure returned from model.");

  const sections: Section[] = sectionsRaw
    .map((sec: any): Section | null => {
      const id = s(sec?.id);
      const icon = s(sec?.icon);
      const label = s(sec?.label);
      const storiesRaw = sec?.stories;
      if (!id || !icon || !label || !Array.isArray(storiesRaw)) return null;

      const stories: Story[] = storiesRaw
        .map((story: any): Story | null => {
          const headline = s(story?.headline);
          let snap = s(story?.snap);
          const detail = s(story?.detail);
          const take = s(story?.take);
          const source = s(story?.source);
          const sourceUrl = urlOrEmpty(story?.sourceUrl);
          const sourceDate = dateOrEmpty(story?.sourceDate);

          if (!headline) return null;
          if (!snap || !detail) return null; // avoid “pre-expanded” rendering failures

          snap = clampSnap(snap);

          const entities = Array.isArray(story?.entities)
            ? (story.entities as unknown[])
                .map((e) => s(e))
                .filter(Boolean)
                .slice(0, MAX_ENTITIES)
            : [];

          return { headline, snap, detail, take, source, sourceUrl, sourceDate, entities };
        })
        .filter(Boolean) as Story[];

      if (stories.length === 0) return null;
      return { id, icon, label, stories };
    })
    .filter(Boolean) as Section[];

  if (sections.length === 0) throw new Error("Brief contained no valid sections after validation.");

  return { sections };
}

