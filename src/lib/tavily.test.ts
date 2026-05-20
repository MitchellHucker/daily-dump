jest.mock("server-only", () => ({}));

import { fetchGeneralHeadlines, GENERAL_NEWS_INCLUDE_DOMAINS, searchTopic } from "./tavily";

describe("searchTopic", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-26T12:00:00Z"));
    process.env.TAVILY_API_KEY = "tvly-test";
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    process.env.TAVILY_API_KEY = originalEnv;
    jest.restoreAllMocks();
  });

  test("posts compact Tavily search request and maps results", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: " Story title ",
            url: " https://example.com/story ",
            content: " Summary snippet ",
            published_date: "2026-04-25",
            raw_content: "Should not be mapped",
          },
          { title: "", url: "https://example.com/empty", content: "No title" },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await searchTopic("AI news", "tech", "AI & Tech", { days: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer tvly-test",
        },
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      query: "AI news",
      search_depth: "advanced",
      topic: "news",
      max_results: 6,
      days: 3,
      include_answer: false,
      include_raw_content: false,
    });
    expect(result).toEqual({
      topic: "AI & Tech",
      sectionId: "tech",
      results: [
        {
          title: "Story title",
          url: "https://example.com/story",
          content: "Summary snippet",
          published_date: "2026-04-25",
        },
      ],
    });
  });

  test("filters stale dated results while keeping fresh and undated results", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: "Fresh result",
            url: "https://example.com/fresh",
            content: "Fresh summary",
            published_date: "2026-04-25",
          },
          {
            title: "Undated result",
            url: "https://example.com/undated",
            content: "Undated summary",
          },
          {
            title: "Old result",
            url: "https://example.com/old",
            content: "Old summary",
            published_date: "2025-01-10",
          },
          {
            title: "Invalid date result",
            url: "https://example.com/invalid",
            content: "Invalid date summary",
            published_date: "not-a-date",
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await searchTopic("legal tech AI news", "legaltech", "LegalTech");

    expect(result.results).toEqual([
      {
        title: "Fresh result",
        url: "https://example.com/fresh",
        content: "Fresh summary",
        published_date: "2026-04-25",
      },
      {
        title: "Undated result",
        url: "https://example.com/undated",
        content: "Undated summary",
      },
    ]);
  });

  test("throws when API key is missing", async () => {
    delete process.env.TAVILY_API_KEY;

    await expect(searchTopic("AI news", "tech", "AI & Tech")).rejects.toThrow(/missing tavily_api_key/i);
  });
});

describe("fetchGeneralHeadlines", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-26T12:00:00Z"));
    process.env.TAVILY_API_KEY = "tvly-test";
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    process.env.TAVILY_API_KEY = originalEnv;
    jest.restoreAllMocks();
  });

  test("posts general news query with max_results 4", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: "Headline A", url: "https://a.com/1", content: "Snap A", published_date: "2026-04-25" },
          { title: "Headline B", url: "https://b.com/2", content: "Snap B" },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await fetchGeneralHeadlines();

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.query).toBe("world geopolitical news headlines international");
    expect(body.max_results).toBe(4);
    expect(body.topic).toBe("news");
    expect(body.include_raw_content).toBe(false);
    expect(body.include_domains).toEqual(GENERAL_NEWS_INCLUDE_DOMAINS);
    expect(results).toHaveLength(2);
    expect(results[0]?.title).toBe("Headline A");
  });

  test("returns empty array when Tavily returns no mappable results", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ title: "", url: "https://empty.com", content: "No title" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await fetchGeneralHeadlines();
    expect(results).toEqual([]);
  });
});
