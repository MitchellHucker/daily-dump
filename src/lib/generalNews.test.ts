import { mapGeneralNewsToStories, parseGeneralNewsArticles } from "./generalNews";
import { sanitizePolishedArticles } from "./generalNewsSynthesis";

describe("generalNews", () => {
  test("parseGeneralNewsArticles requires polished shape", () => {
    const parsed = parseGeneralNewsArticles([
      {
        headline: "WHO declares emergency",
        snap: "Short summary.",
        detail: "Longer context for expand view.",
        url: "https://www.reuters.com/world/example",
        source: "Reuters",
        origin: "Global",
      },
      { title: "Legacy", url: "https://example.com/b", content: "raw only" },
      null,
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.headline).toBe("WHO declares emergency");
    expect(parsed[0]?.origin).toBe("Global");
  });

  test("mapGeneralNewsToStories maps headline snap detail to Story", () => {
    const stories = mapGeneralNewsToStories([
      {
        headline: "World headline",
        snap: "One line summary.",
        detail: "Expanded paragraphs here.",
        url: "https://www.bbc.co.uk/news/story",
        source: "BBC",
        origin: "Europe",
      },
    ]);

    expect(stories[0]).toMatchObject({
      headline: "World headline",
      snap: "One line summary.",
      detail: "Expanded paragraphs here.",
      source: "BBC",
      sourceUrl: "https://www.bbc.co.uk/news/story",
      entities: [],
    });
  });
});

describe("sanitizePolishedArticles", () => {
  test("keeps only articles with allowed urls and required fields", () => {
    const allowed = new Set(["https://www.reuters.com/a", "https://www.bbc.co.uk/b"]);
    const result = sanitizePolishedArticles(
      {
        articles: [
          {
            headline: "Story A",
            snap: "Snap A",
            detail: "Detail A",
            url: "https://www.reuters.com/a",
            source: "Reuters",
            origin: "Global",
          },
          {
            headline: "Hallucinated",
            snap: "Snap",
            detail: "Detail",
            url: "https://evil.com/x",
            source: "Evil",
            origin: "Global",
          },
          { headline: "", snap: "x", detail: "y", url: "https://www.bbc.co.uk/b", source: "BBC", origin: "Europe" },
        ],
      },
      allowed,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe("https://www.reuters.com/a");
  });
});
