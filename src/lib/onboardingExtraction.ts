import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import {
  createEmptyTopicPreference,
  MAX_ONBOARDING_TOPICS,
  sanitizeTopicPreferences,
  TOPIC_OPTIONS,
  type ProfileTopicPreference,
} from "./onboarding";

/** Phase 3.1 vague-input fallback — matches scope (“Technology, Geopolitics, Markets”). */
const DEFAULT_TOPIC_IDS = ["technology", "geopolitics", "finance"] as const;

const ONBOARDING_MODEL = "claude-haiku-4-5";

const onboardingTool: Anthropic.Tool = {
  name: "extract_onboarding_profile",
  description:
    "Map a free-text user self-description onto Daily Dump topic buckets. Topic ids must be chosen only from the configured app list.",
  input_schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        maxItems: MAX_ONBOARDING_TOPICS,
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Topic id exactly as provided in the allowed list (e.g. technology, geopolitics, finance).",
            },
            interests: {
              type: "array",
              items: { type: "string" },
              description: "Subset of predefined interest chips for that topic.",
            },
            lens: {
              type: "string",
              description: "Short briefing lens for this topic grounded in the user's description.",
            },
          },
          required: ["id", "interests", "lens"],
        },
      },
    },
    required: ["topics"],
  },
};

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalise Haiku tool output and apply sane defaults when nothing maps. */
export function mergeExtractedTopics(raw: unknown, maxTopics = MAX_ONBOARDING_TOPICS): ProfileTopicPreference[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.topics)
      ? raw.topics
      : [];
  const sanitized = sanitizeTopicPreferences(list, maxTopics);
  if (sanitized.length > 0) return sanitized;

  return DEFAULT_TOPIC_IDS.map((id) => createEmptyTopicPreference(id)).filter((t): t is ProfileTopicPreference => t !== null);
}

/** Returns topics plus whether we fell back to defaults (caller may surface a banner). */
export async function extractOnboardingTopicsFromDescription(
  userDescription: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<{ topics: ProfileTopicPreference[]; needsReview: boolean }> {
  const trimmed = userDescription.trim();
  if (!trimmed) {
    return { topics: mergeExtractedTopics([]), needsReview: true };
  }

  const client = getClient();
  const ids = TOPIC_OPTIONS.map((t) => t.id).join(", ");
  const chipsSummary = TOPIC_OPTIONS.map((t) => `${t.id}: [${t.interests.join(", ")}]`).join("\n");

  const response = await client.messages.create(
    {
      model: ONBOARDING_MODEL,
      max_tokens: 2000,
      tools: [onboardingTool],
      tool_choice: { type: "tool", name: "extract_onboarding_profile" },
      messages: [
        {
          role: "user",
          content: `The user writes this self-description for a personalised daily news brief:

${JSON.stringify(trimmed)}

Infer up to ${MAX_ONBOARDING_TOPICS} topics. Each topic id must be chosen only from:
${ids}

Allowed interests per topic (only use chips listed for that id):
${chipsSummary}

Return one entry per inferred topic with id (exact token from list above), subset of matching interests only, and lens (one or two sentences) explaining how tomorrow's reporting should tilt for them.`,
        },
      ],
    },
    { signal },
  );

  const toolUse = response.content.find((block) => block.type === "tool_use" && block.name === "extract_onboarding_profile");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Onboarding extraction did not return structured output.");
  }

  const beforeFallback = sanitizeTopicPreferences(
    isRecord(toolUse.input) && Array.isArray(toolUse.input.topics) ? toolUse.input.topics : [],
    MAX_ONBOARDING_TOPICS,
  );

  const topics = mergeExtractedTopics(toolUse.input, MAX_ONBOARDING_TOPICS);
  const needsReview = beforeFallback.length === 0;
  return { topics, needsReview };
}
