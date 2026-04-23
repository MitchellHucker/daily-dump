import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { MessageStreamEvent } from "@anthropic-ai/sdk/resources/messages";
import type { BriefResponse } from "./types";
import { PROFILES, type ProfileId } from "./profiles";

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "complete"; brief: BriefResponse };

const briefTool: Anthropic.Tool = {
  name: "deliver_brief",
  description: "Deliver the structured morning brief",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            icon: { type: "string" },
            label: { type: "string" },
            stories: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "Punchy headline, max 12 words" },
                  snap: { type: "string", description: "One sentence, max 20 words. The whole story in one hit." },
                  detail: {
                    type: "string",
                    description: "2-3 sentences. Balanced, multiple angles. Specific figures where available.",
                  },
                  take: {
                    type: "string",
                    description: "One sentence starting with the person's name followed by a colon. Why this matters for them.",
                  },
                  source: { type: "string", description: "Source name(s)" },
                  sourceUrl: {
                    type: "string",
                    description: "A direct URL to the primary source article (https://...). Leave empty string if unknown.",
                  },
                  sourceDate: {
                    type: "string",
                    description:
                      "Publication date of the primary source article in YYYY-MM-DD format. Only include if you are confident; otherwise use empty string.",
                  },
                  entities: {
                    type: "array",
                    maxItems: 3,
                    items: { type: "string" },
                    description: "Max 3 named companies, products, or topics",
                  },
                },
                required: ["headline", "snap", "detail", "take", "source", "sourceUrl", "sourceDate", "entities"],
              },
            },
          },
          required: ["id", "icon", "label", "stories"],
        },
      },
    },
    required: ["sections"],
  },
};

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
  const prompt = profile.prompt();

  const client = getClient();
  const stream = client.messages.stream(
    {
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
      tools: [{ type: "web_search_20250305", name: "web_search" }, briefTool],
      // Don't force deliver_brief during streaming; allow web_search tool use for live status.
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

  const toolUse = message.content.find((block) => block.type === "tool_use" && block.name === "deliver_brief");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Model did not return a structured brief.");
  yield { type: "complete", brief: toolUse.input as BriefResponse };
}

