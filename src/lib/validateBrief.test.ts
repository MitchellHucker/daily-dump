import { validateBrief } from "./validateBrief";

describe("validateBrief", () => {
  test("accepts a valid brief", () => {
    const raw = {
      sections: [
        {
          id: "tech",
          icon: "⚡",
          label: "AI & Tech",
          stories: [
            {
              headline: "Headline",
              snap: "One sentence snap.",
              detail: "Two sentences detail. Another sentence.",
              take: "Mitchell's take: This matters.",
              source: "FT",
              entities: ["OpenAI", "GPT-4o", "AI pricing"],
            },
          ],
        },
      ],
    };

    const brief = validateBrief(raw);
    expect(brief.sections).toHaveLength(1);
    expect(brief.sections[0].stories).toHaveLength(1);
    expect(brief.sections[0].stories[0].snap).toContain("One sentence");
    expect(brief.sections[0].stories[0].entities).toHaveLength(3);
  });

  test("drops stories missing snap or detail", () => {
    const raw = {
      sections: [
        {
          id: "tech",
          icon: "⚡",
          label: "AI & Tech",
          stories: [
            { headline: "Bad 1", snap: "", detail: "Detail", take: "", source: "", entities: [] },
            { headline: "Bad 2", snap: "Snap", detail: "", take: "", source: "", entities: [] },
            { headline: "Good", snap: "Snap", detail: "Detail", take: "", source: "", entities: [] },
          ],
        },
      ],
    };

    const brief = validateBrief(raw);
    expect(brief.sections).toHaveLength(1);
    expect(brief.sections[0].stories).toHaveLength(1);
    expect(brief.sections[0].stories[0].headline).toBe("Good");
  });

  test("caps entities to 3 and trims strings", () => {
    const raw = {
      sections: [
        {
          id: "tech",
          icon: "⚡",
          label: "AI & Tech",
          stories: [
            {
              headline: "  Headline  ",
              snap: "  Snap  ",
              detail: "  Detail  ",
              take: "  Take  ",
              source: "  Source  ",
              entities: [" A ", "B", "C", "D"],
            },
          ],
        },
      ],
    };

    const brief = validateBrief(raw);
    const story = brief.sections[0].stories[0];
    expect(story.headline).toBe("Headline");
    expect(story.entities).toEqual(["A", "B", "C"]);
  });

  test("throws when nothing valid remains", () => {
    const raw = { sections: [{ id: "x", icon: "x", label: "x", stories: [] }] };
    expect(() => validateBrief(raw)).toThrow(/no valid sections/i);
  });
});

