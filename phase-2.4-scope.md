# Daily Dump — Phase 2.4 Scope

## Goal

Replace the Anthropic web search tool with Tavily as the article retrieval mechanism. This is the primary cost reduction change. Input tokens drop from ~72k to under 20k per generation by replacing full webpage content injection with structured search result snippets.

**Target:** under $0.10 per generation (down from ~$0.60).

---

## Why this works

The Anthropic web search tool fetches full webpage content and injects it into the model context as input tokens. Each search result adds 3,000–8,000 tokens. With 8+ searches, this is the bulk of the 72k input token count.

Tavily returns structured results: title, URL, and a short content snippet (~200 tokens per result). Passing 5–8 results per topic to the model costs roughly 1,500 tokens per topic rather than 8,000+. For 6 sections, that's ~9,000 tokens of search context versus ~50,000. The model then synthesises from this structured input rather than raw webpage content.

---

## Architecture: two-stage generation

**Stage 1 — Tavily retrieval (new)**
For each topic section in the user's profile, call Tavily with a targeted query. Collect structured results. This runs in parallel across topics.

**Stage 2 — Anthropic synthesis (existing, modified)**
Pass the collected Tavily results as structured context in the user message. The model synthesises the brief from this context using the existing `deliver_brief` tool schema. The Anthropic web search tool is removed entirely.

The route.ts and SSE streaming architecture are unchanged. Only `anthropicStream.ts` changes significantly, plus a new `src/lib/tavily.ts` file.

---

## Files to create or modify

### New: `src/lib/tavily.ts`

Tavily client and per-topic search function.

```typescript
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const TAVILY_BASE = "https://api.tavily.com";

export interface TavilyResult {
  title: string;
  url: string;
  content: string; // snippet, ~200 tokens
  published_date?: string;
}

export interface TopicResults {
  topic: string;
  sectionId: string;
  results: TavilyResult[];
}

export async function searchTopic(
  query: string,
  sectionId: string,
  topic: string,
  options: { signal?: AbortSignal } = {}
): Promise<TopicResults> {
  const response = await fetch(`${TAVILY_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",   // Research plan feature — quality results
      max_results: 6,
      days: 2,                    // Only articles from last 2 days — fixes staleness issue
      include_answer: false,
      include_raw_content: false, // Snippets only — keeps tokens low
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed for topic ${topic}: ${response.status}`);
  }

  const data = await response.json();

  return {
    topic,
    sectionId,
    results: (data.results ?? []).map((r: TavilyResult) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      published_date: r.published_date,
    })),
  };
}
```

**Key settings to note:**
- `search_depth: "advanced"` — Research plan feature, returns better quality results
- `days: 2` — Fixes the freshness problem from Increment 1. Only articles from last 48 hours. Adjust to `days: 3` if coverage is too thin for some topics.
- `include_raw_content: false` — Critical. Raw content would inject full page text, defeating the purpose.
- `max_results: 6` — 6 structured results per topic is enough context. More than 8 starts bloating tokens again.

---

### Modified: `src/lib/anthropicStream.ts`

Two changes:
1. Remove the Anthropic web search tool from the API call entirely
2. Run Tavily searches before the Anthropic call, pass results as context in the user message

The `deliver_brief` tool schema, streaming logic, SSE events, and generator structure are all unchanged.

**New flow inside `streamBrief`:**

```typescript
export async function* streamBrief(
  profileId: ProfileId,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<StreamEvent> {
  const profile = PROFILES[profileId];

  // ── STAGE 1: Tavily retrieval ──────────────────────────────────────────
  // Run searches in parallel across all sections
  const searchPromises = profile.sections.map((section) => {
    const query = buildSearchQuery(section, profile);
    yield { type: "status", message: `Finding ${section.label} news…` };
    return searchTopic(query, section.id, section.label, options);
  });

  // Note: you can't yield inside a .map callback — emit status events before
  // launching searches, then await all results together.
  // Pattern: emit status first, then Promise.all.

  for (const section of profile.sections) {
    yield { type: "status", message: `Searching: ${section.label}…` };
  }

  const topicResults = await Promise.all(
    profile.sections.map((section) =>
      searchTopic(buildSearchQuery(section, profile), section.id, section.label, options)
    )
  );

  // ── STAGE 2: Anthropic synthesis ───────────────────────────────────────
  yield { type: "status", message: "Compiling your brief…" };

  const contextBlock = formatResultsForPrompt(topicResults);
  const userMessage = `${profile.prompt}\n\n---\n\nHere are today's articles to draw from:\n\n${contextBlock}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 6000,
    tools: [briefTool],           // deliver_brief only — NO web_search tool
    tool_choice: { type: "tool", name: "deliver_brief" },
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract the tool result when streaming completes
  const response = await stream.finalMessage();
  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "deliver_brief"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a structured brief.");
  }

  yield { type: "complete", brief: toolUse.input as BriefResponse };
}
```

---

### New helper: `buildSearchQuery()`

Add to `src/lib/anthropicStream.ts` or extract to `src/lib/profiles.ts`.

Each profile section needs a targeted Tavily query. These should be specific enough to get relevant results but not so narrow they miss coverage.

```typescript
function buildSearchQuery(section: ProfileSection, profile: Profile): string {
  // Base queries per section ID — tailored per profile
  const queries: Record<string, string> = {
    // Mitchell
    tech:      "AI artificial intelligence technology news today",
    legaltech: "legal technology LegalTech AI law regulation news",
    fintech:   "fintech financial technology startup regulation news",
    markets:   "stock market investing macro economics news today",
    geo:       "geopolitics international relations world news today",
    australia: "Australia visa immigration skilled worker news 2025",
    // Ralitsa
    vendors:     "enterprise software vendor pricing Broadcom Microsoft Oracle SAP news",
    procurement: "IT procurement outsourcing enterprise technology category management news",
    supply:      "semiconductor chip supply chain hardware shortage enterprise news",
    insurance:   "insurance industry regulatory risk news UK",
    ai:          "enterprise AI artificial intelligence adoption cost IT strategy news",
  };

  return queries[section.id] ?? `${section.label} news today`;
}
```

In Phase 3, these queries will be built dynamically from the user's stored profile, interests, and lens. For now, hardcode per section ID.

---

### New helper: `formatResultsForPrompt()`

Formats Tavily results into a compact, structured block for the model prompt. Keeps tokens minimal while giving the model everything it needs.

If a topic has no results, it is explicitly flagged for omission rather than passing an empty block — this prevents the model from filling gaps with hallucinated or stale content.

```typescript
function formatResultsForPrompt(topicResults: TopicResults[]): string {
  return topicResults
    .map((topic) => {
      if (topic.results.length === 0) {
        return `### ${topic.topic}\nNo fresh articles available — omit this section entirely from the brief.`;
      }

      const articles = topic.results
        .map((r, i) =>
          `[${i + 1}] ${r.title}\nURL: ${r.url}${r.published_date ? `\nDate: ${r.published_date}` : ""}\nSummary: ${r.content}`
        )
        .join("\n\n");

      return `### ${topic.topic}\n${articles}`;
    })
    .join("\n\n---\n\n");
}
```

---

### Modified: profile prompts in `src/lib/profiles.ts`

Remove the search cap instruction added in Increment 1 ("maximum 8 web searches") — it's no longer relevant. The model is no longer doing web searches.

Update the prompt instruction to tell the model it is working from provided articles:

Add to both profile prompts:
```
You are given a curated set of today's articles for each section below. Write the brief using only these articles as your sources. Do not search the web. If an article is not recent enough or not relevant, skip it — do not fabricate stories. Only include a section if fresh articles have been provided for it. If a section has no articles, omit it entirely from the brief — it is better to deliver a shorter brief with fewer sections than to include stale or invented content. Where an article has a published date, include it in the source field in the format: Source Name · DD Month (e.g. TechCrunch · 24 April).
```

This prevents the model from hallucinating stories when Tavily results are thin for a topic, and ensures niche sections like Australia are only included when there is genuinely fresh news to report.

---

## Environment variables

Add to `.env.local`:
```
TAVILY_API_KEY=tvly-...
```

Add to Vercel environment variables (same key name).

---

## Status messages

Update the streaming status messages to reflect the new two-stage flow. Users will now see:

1. "Searching: AI & Tech…"
2. "Searching: LegalTech…"
3. "Searching: FinTech…"
4. (one per section, running fast — Tavily is ~1-2 seconds total with parallel calls)
5. "Compiling your brief…" (while Anthropic synthesises)

This is more informative than the previous search query strings and matches what's actually happening.

---

## Freshness and empty sections

The `days: 2` parameter on Tavily searches fixes the staleness issue seen in Increment 1. Only articles from the last 48 hours are returned.

For niche topics (e.g. Australia visa news), Tavily may return zero results on quiet days. This is handled at two levels:

1. `formatResultsForPrompt()` explicitly flags empty topics with "No fresh articles available — omit this section entirely"
2. The model prompt instructs the model to omit any section without fresh articles rather than fabricating content

The result: a brief with 4 or 5 sections on a quiet day is correct behaviour, not a bug. Users get an honest snapshot of what actually happened today.

If a topic consistently returns zero results, increase its `days` window to `3` or `7` as a per-topic override. Add an optional `days` parameter to `searchTopic()` to support this without changing the default.

---

## What does not change

- `src/app/api/generate/route.ts` — untouched
- `src/lib/validateBrief.ts` — untouched
- `src/lib/types.ts` — untouched
- `deliver_brief` tool schema — untouched
- SSE streaming format — untouched
- All frontend components — untouched
- The stub/Preview profile — untouched

---

## Testing and validation

After implementation, generate one brief each for Mitchell and Ralitsa. Check:

1. **Anthropic console logs** — input tokens should be under 25,000. If still above 40k, the raw content is leaking through somewhere (check `include_raw_content: false` is set).
2. **Freshness** — all stories should be from the last 48 hours. If not, confirm `days: 2` is being sent to Tavily.
3. **Quality** — brief should be comparable in relevance to before. If a section has weak results, adjust the search query for that section.
4. **Cost** — target under $0.10 per full generation. At 20k input tokens on Sonnet 4.5, expected cost is ~$0.06.

---

## Definition of done

- [ ] `src/lib/tavily.ts` created with search function
- [ ] Anthropic web search tool removed from API call
- [ ] Tavily searches run in parallel before Anthropic call
- [ ] Results formatted and passed as context in user message
- [ ] Search queries defined per section ID for both profiles
- [ ] Status messages updated to reflect two-stage flow
- [ ] `TAVILY_API_KEY` in `.env.local` and Vercel
- [ ] Generation tested — input tokens under 25k in Anthropic logs
- [ ] Stories are from last 48 hours
- [ ] Sections with no fresh Tavily results are omitted from the brief entirely
- [ ] Article dates appear in source field where available (e.g. "TechCrunch · 24 April")
- [ ] Cost per generation under $0.10
- [ ] Pushed to GitHub, deployed to Vercel
