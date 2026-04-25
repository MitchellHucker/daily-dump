import "server-only";

const TAVILY_BASE = "https://api.tavily.com";
const DEFAULT_DAYS = 2;
const DEFAULT_MAX_RESULTS = 6;

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

export interface TopicResults {
  topic: string;
  sectionId: string;
  results: TavilyResult[];
}

type TavilySearchOptions = {
  signal?: AbortSignal;
  days?: number;
  maxResults?: number;
};

type TavilyResultPayload = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  published_date?: unknown;
};

type TavilyResponsePayload = {
  results?: TavilyResultPayload[];
};

function getApiKey() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Missing TAVILY_API_KEY");
  return apiKey;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapResult(result: TavilyResultPayload): TavilyResult | null {
  const title = asString(result.title);
  const url = asString(result.url);
  const content = asString(result.content);
  const publishedDate = asString(result.published_date);

  if (!title || !url || !content) return null;

  return {
    title,
    url,
    content,
    ...(publishedDate ? { published_date: publishedDate } : {}),
  };
}

export async function searchTopic(
  query: string,
  sectionId: string,
  topic: string,
  options: TavilySearchOptions = {},
): Promise<TopicResults> {
  const response = await fetch(`${TAVILY_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: options.maxResults ?? DEFAULT_MAX_RESULTS,
      days: options.days ?? DEFAULT_DAYS,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed for topic ${topic}: ${response.status}`);
  }

  const data = (await response.json()) as TavilyResponsePayload;
  const results = Array.isArray(data.results) ? data.results.map(mapResult).filter(Boolean) : [];

  return {
    topic,
    sectionId,
    results: results as TavilyResult[],
  };
}
