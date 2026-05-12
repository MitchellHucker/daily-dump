# Daily Dump — Architecture

This file is a quick orientation for future work and future AI chats. Keep it short and update it incrementally each phase.

## TL;DR

Daily Dump is a Next.js app that generates a personalised “morning brief” (multiple sections, multiple stories) using Tavily article retrieval followed by Anthropic synthesis.

Phase status:
- **Phase 1**: UI + stub brief (`STUB_BRIEF`) + profile selection
- **Phase 2**: server-side generation via `/api/generate` (API key stays server-side)
- **Phase 2.1**: streaming progress updates during generation (SSE)
- **Phase 2.4**: Tavily replaces Anthropic web search to reduce input tokens and generation cost
- **Phase 3.0.1**: Clerk auth, sign-in/sign-up routes, protected `/brief` and `/onboarding`
- **Phase 3.0.2**: Supabase service client + lazy Clerk user sync into `users`
- **Phase 3.0.3**: generated briefs cached in Supabase with UTC daily reset
- **Phase 3.0.4**: onboarding stores topic preferences in `profiles` and generation uses stored profiles
- **Phase 3.0.5**: dev mode badge, test profile switcher, and force regenerate controls

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

### Authentication (Phase 3.0.1)

Clerk handles authentication. `src/app/layout.tsx` wraps the app with `ClerkProvider`.

Auth routes use Clerk's path routing and must stay catch-all routes:
- `src/app/sign-in/[[...rest]]/page.tsx`
- `src/app/sign-up/[[...rest]]/page.tsx`

Next.js 16 uses `src/proxy.ts` instead of `src/middleware.ts`. The proxy protects `/brief` and `/onboarding`, and redirects signed-in users from `/` to `/brief`.

### User sync (Phase 3.0.2)

Supabase stores app user records. `src/lib/supabase.ts` exports a server-only service-role client and must never be imported by client components.

When a signed-in user lands on `/brief`, `src/app/brief/page.tsx` runs as a server wrapper, calls `syncCurrentUser()` from `src/lib/userSync.ts`, then renders the unchanged client brief UI in `src/app/brief/BriefClient.tsx`.

`syncCurrentUser()` creates or updates the matching `users` row:
- `id`: Clerk user ID
- `email`: Clerk primary email
- `name`: Clerk display name fallback
- `dev_mode`: set to `false` only on first insert, preserving dashboard changes later

### Brief cache (Phase 3.0.3)

Generated briefs are stored in the Supabase `briefs` table. The daily cache key is the UTC calendar date (`YYYY-MM-DD`), not a rolling 24-hour window.

- `GET /api/briefs` returns today's cached brief, the latest dump, the immediately prior dump, the current UTC date key, and the user's `dev_mode` flag.
- `POST /api/generate` checks today's cache before generating. If a cached brief exists, it streams that brief back as the `complete` event.
- Normal successful generation validates the model output and inserts it into `briefs`.
- Dev-mode force regenerate bypasses today's cache and inserts a new brief row. The UI shows the latest dump as current and the immediately prior row as the previous dump.

### Onboarding and profiles (Phase 3.0.4 + 3.1)

Users without a `profiles` row are redirected from `/brief` to `/onboarding` (free-text first step). Onboarding is protected and server-gated: users who already have a profile are redirected back to `/brief`.

**Primary flow (Phase 3.1):** session storage holds the draft until save.
- `/onboarding`: free-text self-description → `POST /api/onboarding/extract` (Haiku, structured tool) → suggested topics in session → `/onboarding/review`
- `/onboarding/review`: edit overview, topics, interests, lenses → `POST /api/profile` with `overview` + `topics`, then redirect to `/brief`

**Manual fallback:** `/onboarding/topics` → `/onboarding/refine` → `/onboarding/confirm` (same `POST /api/profile`; confirm clears session keys including overview).

Stored `profiles` shape:

```json
{
  "overview": "Verbatim self-description from the user (review screen).",
  "topics": [{ "id": "technology", "label": "Technology", "interests": ["AI"], "lens": "LegalTech startups" }]
}
```

`POST /api/generate` uses the stored profile and prepends non-empty `overview` to the prompt as `User context: …` via `buildUserProfileProfile`. Explicit hardcoded `profileId` generation is restricted to users with `dev_mode = true`.

### Dev mode (Phase 3.0.5)

`users.dev_mode` is managed manually in Supabase. When true, the brief page shows a `Dev mode` badge, a profile switcher, and force-regenerate controls.

The dev switcher includes `Your Profile` plus the legacy Mitchell, Ralitsa, and Preview profiles. `Your Profile` uses the saved `profiles.topics` row; Mitchell and Ralitsa use hardcoded prompts; Preview returns the local stub.

Force regenerate is available only in dev mode for real generation modes (`Your Profile`, Mitchell, Ralitsa). It bypasses today's cache and writes a new `briefs` row, preserving the latest-dump history behavior agreed during Phase 3.0.3.

## Runtime boundaries (what runs where)

- **Client UI**: `src/app/page.tsx` (React client component)
- **Auth shell**: `src/app/layout.tsx`, `src/proxy.ts`, `src/app/sign-in/[[...rest]]/page.tsx`, `src/app/sign-up/[[...rest]]/page.tsx`
- **User sync**: `src/app/brief/page.tsx`, `src/app/brief/BriefClient.tsx`, `src/lib/userSync.ts`, `src/lib/supabase.ts`
- **Brief cache**: `src/app/api/briefs/route.ts`, `src/lib/briefCache.ts`
- **Onboarding/profile persistence**: `src/app/onboarding/**`, `src/app/api/profile/route.ts`, `src/app/api/onboarding/extract/route.ts`, `src/lib/onboarding.ts`, `src/lib/onboardingExtraction.ts`, `src/lib/userProfile.ts`
- **Dev mode UI**: `src/app/brief/BriefClient.tsx`, `src/components/ProfileBar.tsx`
- **Feedback extraction**: `src/components/FeedbackPanel.tsx`, `src/app/api/feedback/route.ts`, `src/lib/feedbackExtraction.ts`
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
- Auth proxy: `src/proxy.ts`
- Auth routes: `src/app/sign-in/[[...rest]]/page.tsx`, `src/app/sign-up/[[...rest]]/page.tsx`
- Brief server wrapper: `src/app/brief/page.tsx`
- Brief client UI: `src/app/brief/BriefClient.tsx`
- Supabase client: `src/lib/supabase.ts`
- User sync: `src/lib/userSync.ts`
- Brief cache helpers: `src/lib/briefCache.ts`
- Brief cache API: `src/app/api/briefs/route.ts`
- Onboarding topic definitions: `src/lib/onboarding.ts`
- User profile helpers: `src/lib/userProfile.ts`
- User profile API: `src/app/api/profile/route.ts`
- Onboarding extraction API: `src/app/api/onboarding/extract/route.ts`
- Feedback extraction API: `src/app/api/feedback/route.ts`
- Feedback extraction helper: `src/lib/feedbackExtraction.ts`
- Onboarding screens: `src/app/onboarding/page.tsx`, `src/app/onboarding/review/page.tsx`, `src/app/onboarding/topics/page.tsx`, `src/app/onboarding/refine/page.tsx`, `src/app/onboarding/confirm/page.tsx`
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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
  - Required for Clerk authentication outside keyless development mode
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/continue`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/continue`
  - Post-auth flows land on `/auth/continue`, a server route that checks the saved profile and redirects to `/brief` or `/onboarding`.
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
  - Used by `src/lib/supabase.ts` for backend writes that bypass RLS
  - Never expose to the browser (no `NEXT_PUBLIC_` prefix)

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
- **Next 16 auth proxy**: use `src/proxy.ts`, not `src/middleware.ts`.
- **Clerk path routing**: `<SignIn />` and `<SignUp />` must live under catch-all routes (`[[...rest]]`) when using `routing="path"`.
- **Supabase service role**: keep `SUPABASE_SERVICE_ROLE_KEY` server-only; import `src/lib/supabase.ts` only from server code.
- **Brief cache date**: use UTC `YYYY-MM-DD` consistently for `briefs.date` and reset countdowns.
- **Onboarding draft storage**: onboarding draft state is temporary browser session storage; the database write happens on confirmation.
- **Dev force regenerate**: current behavior intentionally persists force-regenerated briefs as new rows, even though the original 3.0.5 scope said client-only.

