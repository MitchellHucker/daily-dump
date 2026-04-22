import { parseBrief } from "./parser";

describe("parseBrief", () => {
  test("parses valid input into sections and stories", () => {
    const raw = `
SECTION: ⚡ | AI & Tech | tech
HEADLINE: Story one
SNAP: Short one
DETAIL: Detail one
TAKE: Take one
SOURCE: Source one
ENTITIES: A, B
---
HEADLINE: Story two
SNAP: Short two
DETAIL: Detail two
TAKE: Take two
SOURCE: Source two
ENTITIES: C
---
SECTION: 🌍 | Geopolitics | geo
HEADLINE: Story three
SNAP: Short three
DETAIL: Detail three
TAKE: Take three
SOURCE: Source three
ENTITIES: X, Y
---
`.trim();

    const brief = parseBrief(raw);
    expect(brief.sections).toHaveLength(2);
    expect(brief.sections[0].id).toBe("tech");
    expect(brief.sections[0].stories).toHaveLength(2);
    expect(brief.sections[0].stories[0].headline).toBe("Story one");
    expect(brief.sections[1].id).toBe("geo");
    expect(brief.sections[1].stories).toHaveLength(1);
  });

  test("returns empty sections for empty input", () => {
    expect(parseBrief("").sections).toEqual([]);
    expect(parseBrief("   \n\n ").sections).toEqual([]);
  });

  test("handles malformed input without throwing", () => {
    const raw = `
HEADLINE: No section yet
SNAP: Still no section
---
SECTION: ⚡ | AI & Tech | tech
HEADLINE: Ok now
SNAP: Works
---
`.trim();

    expect(() => parseBrief(raw)).not.toThrow();
    const brief = parseBrief(raw);
    expect(brief.sections).toHaveLength(1);
    expect(brief.sections[0].id).toBe("tech");
  });

  test("handles truncated input (missing fields) without throwing", () => {
    const raw = `
SECTION: ⚡ | AI & Tech | tech
HEADLINE: Truncated story
SNAP: Only snap present
`.trim();

    expect(() => parseBrief(raw)).not.toThrow();
    const brief = parseBrief(raw);
    expect(brief.sections).toHaveLength(1);
    expect(brief.sections[0].stories).toHaveLength(1);
  });
});

