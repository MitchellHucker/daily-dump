import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { MessageStreamEvent } from "@anthropic-ai/sdk/resources/messages";
import { parseBrief } from "./parser";
import { PROFILES, type ProfileId } from "./profiles";
import type { Brief } from "./stubs";

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "complete"; brief: Brief };

const FORMAT_INSTRUCTIONS = `Output MUST be plain text in this exact line-prefixed format. Do NOT output JSON.

For each section, output 2-3 stories. Each story MUST include all fields below.
Separate stories with a line containing exactly:
---

Field rules (match the Preview brief UI):
- HEADLINE: short, punchy
- SNAP: ONE sentence teaser (max ~140 characters). This is the only text shown before expansion.
- DETAIL: 2-5 sentences. This is only shown after expansion.
- TAKE: 1-2 sentences, opinionated, labelled as "<Name>'s take:".
- SOURCE: 1-2 outlets max.
- ENTITIES: 3-8 comma-separated entities.

Formatting rules:
- Every story MUST include SNAP and DETAIL (never omit DETAIL).
- Do not put DETAIL text into SNAP.
- Do not add extra lines without a field prefix (no continuation lines).

Format:
SECTION: <icon> | <label> | <id>
HEADLINE: ...
SNAP: ...
DETAIL: ...
TAKE: ...
SOURCE: ...
ENTITIES: comma, separated, entities
---
`;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

function assertRealProfile(profileId: ProfileId) {
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`Unknown profileId: ${String(profileId)}`);
  if (profile.isStub) throw new Error("Stub profile is not eligible for generation.");
  return profile;
}

function extractWebSearchQuery(block: unknown): string | null {
  if (!block || typeof block !== "object") return null;
  const b = block as { type?: unknown; name?: unknown; input?: unknown };
  // The web search tool is a *server tool* in Anthropic, which surfaces as `server_tool_use`.
  // In some contexts it may also appear as a generic `tool_use` content block.
  if (b.type !== "server_tool_use" && b.type !== "tool_use") return null;
  if (b.name !== "web_search") return null;

  const input = b.input as { query?: unknown } | undefined;
  const query = input?.query;
  return typeof query === "string" && query.trim() ? query.trim() : null;
}

function extractWebSearchQueryFromStreamEvent(ev: MessageStreamEvent): string | null {
  // Some server tool activity may surface in lower-level stream events, not as `contentBlock`.
  // We keep this tolerant: probe common locations without relying on exact event typings.
  const anyEv = ev as unknown as { content_block?: unknown; delta?: unknown };
  const q1 = extractWebSearchQuery(anyEv.content_block);
  if (q1) return q1;
  const q2 = extractWebSearchQuery(anyEv.delta);
  if (q2) return q2;
  return null;
}

export async function* streamBrief(
  profileId: ProfileId,
  opts?: { signal?: AbortSignal },
): AsyncGenerator<StreamEvent, void, void> {
  const profile = assertRealProfile(profileId);
  const prompt = profile.prompt(FORMAT_INSTRUCTIONS);

  const client = getClient();
  const stream = client.messages.stream(
    {
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    },
    { signal: opts?.signal },
  );

  const queue: Array<{ message: string }> = [];
  let ended = false;
  let wake: (() => void) | null = null;

  const notify = (message: string) => {
    queue.push({ message });
    wake?.();
    wake = null;
  };

  stream.on("contentBlock", (content) => {
    const q = extractWebSearchQuery(content);
    if (q) notify(`Searching: ${q}`);
  });

  stream.on("streamEvent", (event) => {
    const q = extractWebSearchQueryFromStreamEvent(event);
    if (q) notify(`Searching: ${q}`);
  });

  stream.on("end", () => {
    ended = true;
    wake?.();
    wake = null;
  });

  // Forward early failures through the generator (so route can surface them).
  let streamError: Error | null = null;
  stream.on("error", (e) => {
    streamError = e;
    ended = true;
    wake?.();
    wake = null;
  });

  // Drain status updates until we have the final message.
  while (!ended || queue.length > 0) {
    if (queue.length > 0) {
      const next = queue.shift();
      if (next) yield { type: "status", message: next.message };
      continue;
    }
    await new Promise<void>((resolve) => {
      wake = resolve;
    });
  }

  if (streamError) throw streamError;

  const message = await stream.finalMessage();
  const raw = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.TextBlock).text)
    .join("\n");

  if (!raw.trim()) throw new Error("Model returned empty text output.");

  const brief = parseBrief(raw);
  yield { type: "complete", brief };
}

