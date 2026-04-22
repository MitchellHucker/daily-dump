# Daily Dump — Architecture

This file is a quick orientation for future work and future AI chats. Keep it short and update it incrementally each phase.

## TL;DR

Daily Dump is a Next.js app that generates a personalised “morning brief” (multiple sections, multiple stories) using Anthropic with **live web search**.

Phase status:
- **Phase 1**: UI + stub brief (`STUB_BRIEF`) + profile selection
- **Phase 2**: server-side generation via `/api/generate` (API key stays server-side)
- **Phase 2.1**: streaming progress updates during generation (SSE)

## Key flows

### Generate brief (Preview vs real profiles)

- **Preview profile**: instant stub data, no API call.
- **Mitchell / Ralitsa**: calls `/api/generate` and renders the parsed brief.

### Streaming progress (Phase 2.1)

`/api/generate` streams Server-Sent Events (SSE) back to the client:
- `event: status` — multiple times during generation (“Searching: …”)
- `event: complete` — once at the end, contains `Brief` JSON

Client consumes SSE via `fetch()` + `response.body.getReader()` (not `EventSource`, because we need POST).

## Runtime boundaries (what runs where)

- **Client UI**: `src/app/page.tsx` (React client component)
- **Server/Edge generation route**: `src/app/api/generate/route.ts`
  - Runs on **Edge runtime**
  - Holds the secret API key server-side
  - Streams SSE frames while generation is in progress
- **Anthropic integration**: `src/lib/anthropicStream.ts` and `src/lib/anthropic.ts`
  - `anthropicStream.ts` is the streaming implementation used by the route
  - `anthropic.ts` is the non-streaming implementation (kept for compatibility/testing)

## Data model (core types)

- `Brief` / `BriefSection` / `Story`: `src/lib/stubs.ts`
- Parser from plain-text format → `Brief`: `src/lib/parser.ts`

The model output format is intentionally **plain text** (line-prefixed) and parsed by `parseBrief()` — we do not request JSON from the model.

## Key files (start here)

- UI entry: `src/app/page.tsx`
- API route: `src/app/api/generate/route.ts`
- Streaming Anthropic wrapper: `src/lib/anthropicStream.ts`
- Non-streaming Anthropic wrapper: `src/lib/anthropic.ts`
- Profiles/prompts: `src/lib/profiles.ts`
- Parser: `src/lib/parser.ts`
- Stub brief: `src/lib/stubs.ts`

## Environment variables

- `ANTHROPIC_API_KEY` (server-side only)
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
- Real profiles show live “Searching: …” updates during loading, then render the brief.

## Production build

```bash
npm run build
```

## Known gotchas

- **Web search tool events**: the web search tool is a **server tool** and may surface as `server_tool_use` (not only `tool_use`).
- **Edge + SSE headers**: avoid forbidden headers (e.g. `Connection: keep-alive`).
- **Client streaming**: do not use `response.json()` for SSE — must read `response.body` incrementally.

