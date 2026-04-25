# Daily Dump - Phase 2.4 Implementation Plan

## Feature

Replace Anthropic web search with Tavily retrieval for brief generation.

The target behavior is a two-stage pipeline:

1. Tavily searches each profile section in parallel and returns compact article snippets.
2. Anthropic receives those snippets as structured prompt context and uses the existing `deliver_brief` tool to synthesize the final brief.

Primary goal: reduce generation input tokens and cost while preserving the existing SSE route, frontend loading flow, `BriefResponse` shape, and validation layer.

## Current code starting point

- `src/app/api/generate/route.ts` already owns the SSE response and should stay largely unchanged.
- `src/lib/anthropicStream.ts` currently:
  - creates the Anthropic client
  - includes the `web_search_20250305` tool
  - listens for web search tool events to produce `status` messages
  - extracts the final `deliver_brief` tool result
- `src/lib/profiles.ts` contains the two real hardcoded profiles and prompt text.
- `src/lib/validateBrief.ts` validates the model output after `streamBrief()` completes.
- `src/lib/types.ts` already includes `sourceUrl` and `sourceDate`, so Tavily URLs and dates can flow through without type changes.

## Increment 1 - Tavily retrieval module

Create `src/lib/tavily.ts`.

Tasks:

- Read `TAVILY_API_KEY` from the server environment.
- Export:
  - `TavilyResult`
  - `TopicResults`
  - `searchTopic(query, sectionId, topic, options)`
- POST to `https://api.tavily.com/search`.
- Use:
  - `search_depth: "advanced"`
  - `max_results: 6`
  - `days: 2`
  - `include_answer: false`
  - `include_raw_content: false`
- Pass through `AbortSignal` from the route.
- Throw a clear error if the key is missing or Tavily returns a non-2xx response.

Verification:

- Add focused unit coverage for response mapping if the existing test setup can mock `fetch` cleanly.
- Confirm no raw content field is requested or forwarded.

## Increment 2 - Query and prompt-context helpers

Add helpers near `streamBrief()` unless reuse pressure suggests extracting them later.

Tasks:

- Add `buildSearchQuery(section, profile)` for the current hardcoded profile sections.
- Add `formatResultsForPrompt(topicResults)`.
- Ensure empty result sets are explicitly represented as:
  - "No fresh articles available - omit this section entirely from the brief."
- Include article title, URL, optional published date, and snippet only.
- Keep the formatted block compact; do not include Tavily raw content.

Repo-specific note:

- The section id `geo` is shared by Mitchell and Ralitsa. If one generic query is too broad for Ralitsa's procurement-risk lens, branch on `profile.id` for that section.

Verification:

- Unit test query selection for both profiles.
- Unit test prompt formatting for populated and empty topics.

## Increment 3 - Replace Anthropic web search in `streamBrief()`

Modify `src/lib/anthropicStream.ts`.

Tasks:

- Emit one status event per section before retrieval:
  - `Searching: AI & Tech...`
  - `Searching: LegalTech...`
  - etc.
- Run all Tavily section searches with `Promise.all`.
- Emit `Compiling your brief...` after retrieval completes.
- Build the Anthropic user message from:
  - the existing profile prompt
  - the formatted Tavily context block
- Remove the Anthropic `web_search_20250305` tool entirely.
- Keep only `briefTool` in the Anthropic tools array.
- Use `tool_choice: { type: "tool", name: "deliver_brief" }`.
- Remove now-unused web-search event extraction helpers from `anthropicStream.ts`.
- Preserve the generator contract:
  - `status` events while work progresses
  - one final `complete` event with `BriefResponse`

Verification:

- `npm run build`
- `npm test`
- Generate Mitchell and Ralitsa briefs with real keys and inspect that the UI still receives SSE status and complete events.

## Increment 4 - Update profile prompts

Modify `src/lib/profiles.ts`.

Tasks:

- Remove or replace wording that tells the model to search the web.
- Add instructions that the model must use only the provided articles.
- Tell the model to omit sections with no fresh articles.
- Tell the model not to fabricate or backfill missing sections.
- Ask it to preserve article URLs in `sourceUrl` and dates in `sourceDate` when available.

Verification:

- Confirm generated briefs do not cite sources outside the Tavily context.
- Confirm empty Tavily topics are omitted after validation rather than hallucinated.

## Increment 5 - Environment and docs

Tasks:

- Document `TAVILY_API_KEY` alongside `ANTHROPIC_API_KEY` in developer setup docs.
- Add the same key to Vercel before production validation.
- Update `ARCHITECTURE.md` after implementation to reflect Tavily retrieval instead of Anthropic live web search.

Verification:

- Local `.env.local` has both keys, but remains uncommitted.
- Vercel has `TAVILY_API_KEY` configured before deployment testing.

## Final validation checklist

- `npm run build` passes.
- `npm test` passes.
- Mitchell generation succeeds.
- Ralitsa generation succeeds.
- Status messages show section-level Tavily searches, then compilation.
- Anthropic console shows input tokens under 25,000.
- Tavily requests use `days: 2`.
- No raw Tavily content is sent to Anthropic.
- Stories are recent and source URLs are populated where Tavily provided URLs.
- Sections with no fresh Tavily results are omitted.
- Cost per generation trends under the Phase 2.4 target.

## Risks and watch points

- Tavily may return thin results for niche sections. Prefer per-section `days` overrides over increasing the global freshness window.
- Shared section ids can hide profile-specific intent. Handle `geo` carefully for Ralitsa versus Mitchell.
- If the Anthropic SDK stream no longer emits useful intermediate events without web search, the explicit section retrieval statuses become the source of truth for progress.
- Edge runtime compatibility depends on using standard `fetch` and avoiding Node-only APIs in `tavily.ts`.
