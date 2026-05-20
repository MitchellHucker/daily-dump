import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { GeneralNewsArticle } from "./generalNews";
import type { TavilyResult } from "./tavily";

const SYNTHESIS_MODEL = "claude-haiku-4-5";
const MAX_HEADLINES = 4;

const synthesisTool: Anthropic.Tool = {
  name: "polish_general_headlines",
  description:
    "Turn raw search snippets into readable general news cards. Each output article must use the same url as its source item.",
  input_schema: {
    type: "object",
    properties: {
      articles: {
        type: "array",
        maxItems: MAX_HEADLINES,
        items: {
          type: "object",
          properties: {
            headline: { type: "string", description: "Clear headline without site suffix clutter." },
            snap: { type: "string", description: "One or two sentence summary for collapsed view." },
            detail: { type: "string", description: "Three to five sentences for expanded view. No markdown, timestamps, or feed junk." },
            url: { type: "string", description: "Must exactly match one input url." },
            source: { type: "string", description: "Publisher name, e.g. Reuters or BBC." },
            origin: {
              type: "string",
              description: "Short geographic focus: Global, Europe, Americas, Middle East, Asia-Pacific, Africa, or similar.",
            },
          },
          required: ["headline", "snap", "detail", "url", "source", "origin"],
        },
      },
    },
    required: ["articles"],
  },
};

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalise Haiku tool output; only keep rows whose url was in the Tavily set. */
export function sanitizePolishedArticles(raw: unknown, allowedUrls: Set<string>, maxItems = MAX_HEADLINES): GeneralNewsArticle[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.articles)
      ? raw.articles
      : [];

  const articles: GeneralNewsArticle[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const url = asString(item.url);
    if (!url || !allowedUrls.has(url)) continue;

    const headline = asString(item.headline);
    const snap = asString(item.snap);
    const detail = asString(item.detail);
    const source = asString(item.source);
    const origin = asString(item.origin);
    if (!headline || !snap || !detail || !source) continue;

    const publishedDate = asString(item.published_date);
    articles.push({
      headline,
      snap,
      detail,
      url,
      source,
      origin: origin || "Global",
      ...(publishedDate ? { published_date: publishedDate } : {}),
    });
    if (articles.length >= maxItems) break;
  }

  return articles;
}

export async function synthesizeGeneralHeadlines(
  rawResults: TavilyResult[],
  { signal }: { signal?: AbortSignal } = {},
): Promise<GeneralNewsArticle[]> {
  if (rawResults.length === 0) return [];

  const allowedUrls = new Set(rawResults.map((r) => r.url));
  const client = getClient();

  const payload = rawResults.map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    ...(r.published_date ? { published_date: r.published_date } : {}),
  }));

  const response = await client.messages.create(
    {
      model: SYNTHESIS_MODEL,
      max_tokens: 4000,
      tools: [synthesisTool],
      tool_choice: { type: "tool", name: "polish_general_headlines" },
      messages: [
        {
          role: "user",
          content: `You are editing a "while you wait" global headlines strip for a news app.

Input (${payload.length} raw search hits — may contain timestamps, "##" markers, video rundowns, or other scrape junk):

${JSON.stringify(payload)}

Rules:
- Focus on world geopolitical and international news. Skip purely local crime, weather, or celebrity items unless globally significant.
- For each item you keep, rewrite headline, snap, and detail in clear British English prose (no markdown, no "Image 123", no timestamp prefixes).
- snap: 1–2 sentences. detail: 3–5 sentences with useful context.
- url must be copied exactly from the matching input item.
- origin: short region label (Global, Europe, Americas, Middle East, Asia-Pacific, Africa).
- Return up to ${MAX_HEADLINES} strongest international stories.`,
        },
      ],
    },
    { signal },
  );

  const toolUse = response.content.find((block) => block.type === "tool_use" && block.name === "polish_general_headlines");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("General news synthesis did not return structured output.");
  }

  const polished = sanitizePolishedArticles(toolUse.input, allowedUrls, MAX_HEADLINES);
  if (polished.length === 0) {
    throw new Error("General news synthesis returned no valid articles.");
  }

  return polished;
}
