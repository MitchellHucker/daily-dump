# Daily Dump — Phase 2.1 Scope

## What we are building

Streaming status updates during brief generation. Replaces the static "SEARCHING · COMPILING · WRITING" spinner with live progress messages that reflect what the AI is actually doing — e.g. "Searching: UK visa changes 2025" — surfaced in real time as the model runs web searches.

This is a UX enhancement to Phase 2's core generation feature. No new data, no new components, no auth or persistence. The brief output is unchanged — only the loading experience improves.

---

## The problem

Generation takes 20–40 seconds. The current spinner gives no feedback during that time. Users have no way to know if the app is working or stuck. This is the biggest UX friction point of the core feature.

---

## How it works

The Anthropic API supports streaming — instead of waiting for the full response, you receive events as they happen. One of those event types is `tool_use`, which fires each time the model triggers a web search, containing the query it used.

By switching the API route to streaming mode and forwarding those tool use events to the frontend in real time, we can display messages like:

- "Searching: OpenAI pricing changes April 2025"
- "Searching: UK LegalTech regulation SRA 2025"
- "Searching: Australia TSS 482 visa threshold"

These are the model's actual search queries — genuine feedback, not fake rotation.

---

## Implementation

### Server side — update `src/app/api/generate/route.ts`

Switch from `client.messages.create()` to `client.messages.stream()`. Use a **Server-Sent Events (SSE)** response to push events to the frontend as they arrive.

What to stream:
- Each `tool_use` block where `name === "web_search"` → extract the query and send it as a status message
- A final event when the complete text response is ready → send the parsed brief

SSE is the right transport here: simple, built into the browser, works over standard HTTP with no websocket complexity. Return a `ReadableStream` with `Content-Type: text/event-stream`.

Event format (simple, two types):

```
event: status
data: Searching: UK visa changes 2025

event: complete
data: { ...parsed brief JSON... }
```

### Client side — update `src/app/page.tsx`

Replace the simple `fetch()` POST with an SSE listener using `EventSource` or `fetch()` with a streaming reader.

On `status` events: update a status line below the spinner with the latest message.
On `complete` event: parse the brief and transition to the done state as before.

The spinner and loading state remain — only the text underneath changes from static to live.

### UI — update loading state in the spinner component

Current:
```
SEARCHING · COMPILING · WRITING
```

New: keep that line as a subtitle, add a live status line above or below that updates with each search query. Keep it subtle — monospace, small, muted colour. The point is presence, not noise.

---

## What does not change

- The brief output format and parser — untouched
- All components (ProfileBar, StoryCard, BriefView etc.) — untouched
- Preview/stub profile — still resolves instantly, no streaming needed
- Error handling — same error state as before, triggered if the stream fails

---

## Definition of done

- [ ] API route streams events rather than waiting for full response
- [ ] Each web search query the model runs appears as a status message during loading
- [ ] Final brief arrives via the stream and renders correctly
- [ ] Preview profile still resolves instantly — unaffected
- [ ] No regression in brief quality or parser behaviour
- [ ] Works on both localhost and daily-dump.vercel.app
- [ ] Committed and pushed to GitHub

---

## Implementation notes / handoff (post-build)

This section captures what was actually implemented so future chats can start in the right place.

### Current architecture (Phase 2.1)

- **Route transport**: `POST /api/generate` returns **SSE** (`text/event-stream`) from an Edge Route Handler.
- **Event types**:
  - `event: status` / `data: ...` (multiple times during generation)
  - `event: complete` / `data: <Brief JSON>` (once at the end)
- **Client consumption**: the frontend uses `fetch()` + `response.body.getReader()` (not `EventSource`, since we need POST).

### Key files

- `src/app/api/generate/route.ts`
  - Runs on **Edge runtime**.
  - Creates a `ReadableStream` and `enqueue()`s SSE frames.
  - Sends an immediate `status` frame (`Starting…`) to prove flushing/streaming begins instantly.
- `src/lib/anthropicStream.ts`
  - Calls `client.messages.stream(...)`.
  - Streams web search progress by extracting the **server tool** usage for `web_search`.
  - Important: web search is a **server tool**, so it may surface as `type: server_tool_use` (not only `tool_use`).
  - Also listens to lower-level `streamEvent` in case tool activity is not emitted as a top-level content block.
- `src/app/page.tsx`
  - Parses SSE frames split by blank lines (`\\n\\n`).
  - Updates a `liveStatus` line on `status` frames and renders the brief on `complete`.

### Edge/SSE gotchas

- **Forbidden headers**: avoid setting `Connection: keep-alive` in Edge route handlers.
- **Buffering**: keep `Content-Type: text/event-stream` and `Cache-Control: no-cache, no-transform`. Optional: `X-Accel-Buffering: no`.

### Quick verification (local)

- Run `npm run dev`
- Generate as Mitchell/Ralitsa
- You should see the loading line update with real search queries (multiple `Searching: ...` messages) before the final brief renders.