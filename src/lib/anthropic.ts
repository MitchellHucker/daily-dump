import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { parseBrief } from "./parser";
import { PROFILES, type ProfileId } from "./profiles";
import type { Brief } from "./stubs";

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

export async function generateBrief(profileId: ProfileId): Promise<Brief> {
  const profile = assertRealProfile(profileId);
  const prompt = profile.prompt(FORMAT_INSTRUCTIONS);

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 6000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.TextBlock).text)
    .join("\n");

  if (!raw.trim()) throw new Error("Model returned empty text output.");

  try {
    return parseBrief(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse brief: ${msg}`);
  }
}

