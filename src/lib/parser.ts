import type { Brief, BriefSection, Story } from "./stubs";

// Parses the line-prefixed text format into a { sections: [...] } structure.
// Ported directly from the POC logic — do not rewrite behavior.
export function parseBrief(raw: string): Brief {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: BriefSection[] = [];
  let currentSection: BriefSection | null = null;
  let currentStory: Partial<Story> | null = null;

  const pushStory = () => {
    if (currentStory && currentSection && currentStory.headline) {
      currentSection.stories.push(currentStory as Story);
    }
    currentStory = null;
  };

  const pushSection = () => {
    pushStory();
    if (currentSection && currentSection.stories.length > 0) {
      sections.push(currentSection);
    }
    currentSection = null;
  };

  for (const line of lines) {
    if (line.startsWith("SECTION:")) {
      pushSection();
      const parts = line
        .replace("SECTION:", "")
        .trim()
        .split("|")
        .map((p) => p.trim());
      currentSection = {
        icon: parts[0] || "",
        label: parts[1] || "",
        id: parts[2] || "",
        stories: [],
      };
      currentStory = {};
    } else if (line === "---") {
      pushStory();
      if (currentSection) currentStory = {};
    } else if (line.startsWith("HEADLINE:")) {
      if (!currentStory) currentStory = {};
      currentStory.headline = line.replace("HEADLINE:", "").trim();
    } else if (line.startsWith("SNAP:")) {
      if (!currentStory) currentStory = {};
      currentStory.snap = line.replace("SNAP:", "").trim();
    } else if (line.startsWith("DETAIL:")) {
      if (!currentStory) currentStory = {};
      currentStory.detail = line.replace("DETAIL:", "").trim();
    } else if (line.startsWith("TAKE:")) {
      if (!currentStory) currentStory = {};
      currentStory.take = line.replace("TAKE:", "").trim();
    } else if (line.startsWith("SOURCE:")) {
      if (!currentStory) currentStory = {};
      currentStory.source = line.replace("SOURCE:", "").trim();
    } else if (line.startsWith("ENTITIES:")) {
      if (!currentStory) currentStory = {};
      currentStory.entities = line
        .replace("ENTITIES:", "")
        .trim()
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
    } else if (currentStory) {
      // Continuation line — append to last field set
      const last = (["detail", "snap", "take"] as const).find((f) => Boolean(currentStory?.[f]));
      if (last) currentStory[last] = `${currentStory[last]} ${line}`;
    }
  }

  pushSection();
  return { sections };
}

