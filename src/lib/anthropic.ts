import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { BriefResponse } from "./types";
import { PROFILES, type ProfileId } from "./profiles";

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

export async function generateBrief(profileId: ProfileId): Promise<BriefResponse> {
  const profile = assertRealProfile(profileId);
  const prompt = profile.prompt();

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 6000,
    tools: [{ type: "web_search_20250305", name: "web_search" }, briefTool],
    tool_choice: { type: "tool", name: "deliver_brief" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use" && block.name === "deliver_brief");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Model did not return a structured brief.");

  return toolUse.input as BriefResponse;
}

