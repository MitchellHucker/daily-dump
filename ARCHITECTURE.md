# Daily Dump — Architecture

This file is a quick orientation for future work and future AI chats. Keep it short and update it incrementally each phase.

## TL;DR

Daily Dump is a Next.js app that generates a personalised “morning brief” (multiple sections, multiple stories) using Tavily article retrieval followed by Anthropic synthesis.

Phase status:
- **Phase 1**: UI + stub brief (`STUB_BRIEF`) + profile selection
- **Phase 2**: server-side generation via `/api/generate` (API key stays server-side)
- **Phase 2.1**: streaming progress updates during generation (SSE)
- **Phase 2.4**: Tavily replaces Anthropic web search to reduce input tokens and generation cost

## Key flows

### Generate brief (Preview vs real profiles)

- **Preview profile**: instant stub data, no API call.
- **Mitchell / Ralitsa**: calls `/api/generate` and renders the parsed brief.

### Streaming progress (Phase 2.1 / Phase 2.4)

`/api/generate` streams Server-Sent Events (SSE) back to the client:
- `event: status` — once per Tavily section search, then “Compiling your brief...”
- `event: complete` — once at the end, contains `Brief` JSON

Client consumes SSE via `fetch()` + `response.body.getReader()` (not `EventSource`, because we need POST).

### Retrieval and synthesis (Phase 2.4)

Real profiles use a two-stage server-side generation flow:

1. `src/lib/tavily.ts` searches Tavily once per profile section in parallel. Requests use snippets only (`include_raw_content: false`) and the default freshness window is 2 days.
2. `src/lib/anthropicStream.ts` formats those results as compact prompt context and asks Anthropic to synthesize the final brief via the `deliver_brief` tool.

Anthropic's hosted web search tool is no longer included in the generation request.

## Runtime boundaries (what runs where)

- **Client UI**: `src/app/page.tsx` (React client component)
- **Server/Edge generation route**: `src/app/api/generate/route.ts`
  - Runs on **Edge runtime**
  - Holds the secret API key server-side
  - Streams SSE frames while generation is in progress
- **Tavily retrieval**: `src/lib/tavily.ts` and `src/lib/searchContext.ts`
- **Anthropic integration**: `src/lib/anthropicStream.ts` and `src/lib/anthropic.ts`
  - `anthropicStream.ts` is the streaming implementation used by the route
  - `anthropic.ts` is the non-streaming implementation (kept for compatibility/testing)

## Data model (core types)

- `BriefResponse` / `Section` / `Story`: `src/lib/types.ts`
- Stub brief data: `src/lib/stubs.ts`
- Validation and sanitisation: `src/lib/validateBrief.ts`

Anthropic returns structured data by filling the `deliver_brief` tool schema. The API route validates and sanitises that tool input before streaming the final `complete` event to the client.

## Key files (start here)

- UI entry: `src/app/page.tsx`
- API route: `src/app/api/generate/route.ts`
- Streaming Anthropic wrapper: `src/lib/anthropicStream.ts`
- Non-streaming Anthropic wrapper: `src/lib/anthropic.ts`
- Tavily client: `src/lib/tavily.ts`
- Search query/context helpers: `src/lib/searchContext.ts`
- Profiles/prompts: `src/lib/profiles.ts`
- Validator: `src/lib/validateBrief.ts`
- Stub brief: `src/lib/stubs.ts`

## Environment variables

- `ANTHROPIC_API_KEY` (server-side only)
  - In `.env.local` for local dev
  - In Vercel project environment variables for deployment
  - Never expose to the browser (no `NEXT_PUBLIC_` prefix)
- `TAVILY_API_KEY` (server-side only)
  - In `.env.local` for local dev
  - In Vercel project environment variables for deployment
  - Never expose to the browser (no `NEXT_PUBLIC_` prefix)

Note: `NEXT_PUBLIC_ANTHROPIC_API_KEY` may still exist for `FeedbackPanel` (planned to move server-side later).

## Testing

- Jest is configured via `jest.config.ts` and `jest.setup.ts`.
- Run:

```bash
npm test
```

## Local development

```bash
npm run dev
```

Expected behavior:
- Preview generates instantly (stub).
- Real profiles show section-level “Searching: …” updates during Tavily retrieval, then “Compiling your brief...” while Anthropic writes the brief.

## Production build

```bash
npm run build
```

## Known gotchas

- **Tavily key required**: real profile generation now fails fast if `TAVILY_API_KEY` is missing.
- **Raw content must stay off**: keep `include_raw_content: false`; sending full article text defeats the Phase 2.4 cost reduction.
- **Edge + SSE headers**: avoid forbidden headers (e.g. `Connection: keep-alive`).
- **Client streaming**: do not use `response.json()` for SSE — must read `response.body` incrementally.

