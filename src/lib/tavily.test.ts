jest.mock("server-only", () => ({}));

import { searchTopic } from "./tavily";

describe("searchTopic", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    process.env.TAVILY_API_KEY = "tvly-test";
  });

  afterEach(() => {
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

  test("throws when API key is missing", async () => {
    delete process.env.TAVILY_API_KEY;

    await expect(searchTopic("AI news", "tech", "AI & Tech")).rejects.toThrow(/missing tavily_api_key/i);
  });
});
