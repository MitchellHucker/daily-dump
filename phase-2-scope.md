# Daily Dump — Phase 2 Scope

## What we are building

Server-side AI generation for Daily Dump. This phase replaces the hardcoded stub brief with a real brief generated from live web sources via the Anthropic API. It is the core value of the product — the thing that determines whether the app is worth using daily.

Phase 2 is **AI generation only**. No auth, no database, no persistence. The stub profile (Preview) stays for testing. Mitchell and Ralitsa's profiles generate real briefs.

## Reference

- Phase 1 codebase: `src/` layout, components, and lib files already in place
- POC reference: `C:\Users\mhuck\Documents\Work\Daily Dump App\Design Files - Claude\morning-dump-v5.jsx`
- The POC called the Anthropic API directly from the browser — Phase 2 moves this server-side

---

## The core change: server-side API route

In the POC, the Anthropic API was called directly from the frontend (browser). This is not acceptable for production because:

- The API key is exposed in the browser — anyone can read it and use it at your expense
- There is no place to add rate limiting, caching, or logging
- It violates Anthropic's terms of use for production applications

Phase 2 introduces a **Next.js API route** — a server-side function that lives in your codebase but runs on the server, not in the browser. The frontend calls your own API route, which holds the key and calls Anthropic. The key never leaves the server.

---

## Files to create

### `src/app/api/generate/route.ts`
The core server-side route. Accepts a POST request from the frontend containing the profile ID. Builds the prompt for that profile, calls the Anthropic API with web search enabled, parses the plain-text response using `parseBrief()`, and returns the structured brief as JSON.

### `src/lib/anthropic.ts`
Anthropic SDK client and prompt builder. Initialises the SDK using the server-side API key. Exports a `generateBrief(profileId)` function used by the route. Keeps the route file clean.

### Updates to `src/app/page.tsx`
Replace the current stub resolution logic with a `fetch()` call to `/api/generate`. Handle the loading, success, and error states that already exist in the UI — the components don't change, only what populates them.

### Updates to `src/lib/profiles.ts`
Ensure prompt functions are exported cleanly for use by `anthropic.ts`. Minor refactor only — the prompt content itself is already correct.

---

## Environment variables

Add to `.env.local` (local development):
```
ANTHROPIC_API_KEY=sk-ant-...
```

Note: **no** `NEXT_PUBLIC_` prefix. This key is server-side only and must never be exposed to the browser. Next.js automatically keeps variables without that prefix server-side.

Add the same key to Vercel for the live deployment:
Vercel dashboard → daily-dump project → Settings → Environment Variables → Add `ANTHROPIC_API_KEY`.

The existing `NEXT_PUBLIC_ANTHROPIC_API_KEY` used by FeedbackPanel can remain for now — that moves server-side in Phase 3.

---

## SDK installation

Before building the route, install the Anthropic SDK:

```
npm install @anthropic-ai/sdk
```

This is the official Anthropic Node.js client. It handles authentication, request formatting, and response parsing. Import it in `src/lib/anthropic.ts` — never import it in frontend files.

---

## API call specifics

The Anthropic API call in `src/lib/anthropic.ts` must use these exact settings:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 6000,
  tools: [{ type: "web_search_20250305", name: "web_search" }],
  messages: [{ role: "user", content: prompt }],
});
```

**Why each setting matters:**

- **`model: "claude-sonnet-4-5"`** — the model used throughout development and testing. Do not substitute a different model without explicit instruction.
- **`max_tokens: 6000`** — must be at least 6000. Lower values cause the response to be truncated mid-brief, which breaks the parser. This was the root cause of earlier parse errors in the POC.
- **`tools: [{ type: "web_search_20250305", name: "web_search" }]`** — enables live web search. Without this the model generates from training data only and cannot report on today's news. The tool name is exact and version-specific — do not change it.

Extract text content from the response like this:

```typescript
const raw = response.content
  .filter((block) => block.type === "text")
  .map((block) => (block as Anthropic.TextBlock).text)
  .join("\n");
```

The response may contain multiple content blocks including tool use blocks (web search activity) — filtering for `type === "text"` extracts only the final written output.

---

## Output format

The Anthropic API call uses the same plain-text line-prefixed format established in the POC:

```
SECTION: ⚡ | AI & Tech | tech
HEADLINE: ...
SNAP: ...
DETAIL: ...
TAKE: ...
SOURCE: ...
ENTITIES: ...
---
```

Do not switch to JSON output. The plain-text format was chosen specifically because it cannot be broken by unescaped characters or truncation. The existing `parseBrief()` function in `src/lib/parser.ts` handles it — do not rewrite the parser.

---

## Generation behaviour

- **No caching in Phase 2** — every Generate button press calls the API fresh. Acceptable for two users during testing, and allows prompt changes to be tested immediately without cache invalidation.
- **No rate limiting in Phase 2** — auth does not exist yet so per-user limits are not possible. Acceptable for two known users.
- **Preview profile (stub) unchanged** — still resolves instantly with `STUB_BRIEF`. Do not remove this — it is essential for testing UI changes without waiting for generation or consuming API credits.
- **Error handling** — the UI already has an error state. The API route should return a meaningful error message if generation fails, which the frontend surfaces to the user.

---

## Unit testing (introduce in this phase)

Install Jest and React Testing Library alongside this phase. Do not leave testing until the polish phase — the parser and profile logic are the right place to start, and the habit is easier to build early.

**What to test in Phase 2:**
- `parseBrief()` in `src/lib/parser.ts` — the most critical function in the codebase. Test with valid input, malformed input, truncated input, and empty input.
- Profile prompt builder in `src/lib/profiles.ts` — verify the correct prompt is returned for each profile ID.
- The `/api/generate` route — mock the Anthropic SDK and verify the route handles success and error cases correctly.

**Tools:**
- Jest — free, industry standard, works natively with Next.js
- React Testing Library — for component tests (Phase 3 onwards)

Setup:
```
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest
```

---

## Parking lot (future phases — do not build now)

These items were raised during planning. Captured here so they are not forgotten.

**Dev tools (Phase 5 — Polish):**
- Force regeneration override — bypasses any future caching for development and testing purposes
- Stub mode toggle — ability to switch any profile to return stub data without changing code, useful when testing UI features without needing fresh content or API calls

**Caching (Phase 3/4):**
- Once Supabase is in place, store generated briefs with a `generated_at` timestamp
- Serve cached brief if already generated today; only call API if stale
- Per-user rate limit (one generation per day for free tier) enforced at the API route level

**End-to-end testing (Phase 3 — alongside auth):**
- Playwright for browser automation — verify full flows: profile selection → generate → brief renders → story expands → feedback submits
- Introduce once auth exists so tests can log in as a test user

---

## Definition of done

- [ ] `ANTHROPIC_API_KEY` added to `.env.local` locally and to Vercel environment variables
- [ ] `src/app/api/generate/route.ts` created and functional
- [ ] `src/lib/anthropic.ts` created with SDK client and prompt builder
- [ ] Mitchell's profile generates a real brief from live web data
- [ ] Ralitsa's profile generates a real brief from live web data
- [ ] Preview profile still resolves instantly with stub data
- [ ] Error state renders correctly if the API call fails
- [ ] API key is confirmed server-side only — not visible in browser network requests
- [ ] Jest installed and at least `parseBrief()` has passing unit tests
- [ ] Changes pushed to GitHub and live at daily-dump.vercel.app
- [ ] Both Mitchell and Ralitsa have tested the live URL and generated at least one real brief