import { buildSearchPlan, buildSearchQuery, formatResultsForPrompt } from "./searchContext";
import { PROFILES } from "./profiles";

describe("search context helpers", () => {
  test("builds profile-specific queries for shared section ids", () => {
    const mitchellGeo = PROFILES.mitchell.sections.find((section) => section.id === "geo");
    const ralitsaGeo = PROFILES.ralitsa.sections.find((section) => section.id === "geo");

    expect(mitchellGeo).toBeDefined();
    expect(ralitsaGeo).toBeDefined();
    expect(buildSearchQuery(mitchellGeo!, PROFILES.mitchell)).toContain("international relations");
    expect(buildSearchQuery(ralitsaGeo!, PROFILES.ralitsa)).toContain("supply chain risk");
  });

  test("builds a two-day search plan for every profile section", () => {
    const plan = buildSearchPlan(PROFILES.mitchell);

    expect(plan).toHaveLength(PROFILES.mitchell.sections.length);
    expect(plan[0]).toMatchObject({
      section: PROFILES.mitchell.sections[0],
      days: 2,
    });
    expect(plan[0].query).toContain("AI");
  });

  test("formats populated and empty Tavily results for the prompt", () => {
    const promptBlock = formatResultsForPrompt([
      {
        topic: "AI & Tech",
        sectionId: "tech",
        results: [
          {
            title: "New AI product launches",
            url: "https://example.com/ai",
            content: "A short Tavily snippet.",
            published_date: "2026-04-25",
          },
        ],
      },
      {
        topic: "Australia",
        sectionId: "australia",
        results: [],
      },
    ]);

    expect(promptBlock).toContain("### AI & Tech");
    expect(promptBlock).toContain("URL: https://example.com/ai");
    expect(promptBlock).toContain("Date: 2026-04-25");
    expect(promptBlock).toContain("Summary: A short Tavily snippet.");
    expect(promptBlock).toContain("No fresh articles available - omit this section entirely");
  });
});
