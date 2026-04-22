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