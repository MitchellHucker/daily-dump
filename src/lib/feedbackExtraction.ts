import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export type FeedbackExtraction = {
  liked?: string[];
  add_topics?: string[];
  more_depth_on?: string[];
  remove_or_reduce?: string[];
  summary?: string;
};

const feedbackTool: Anthropic.Tool = {
  name: "extract_feedback_signals",
  description: "Extract structured preference signals from feedback on a personalised news brief.",
  input_schema: {
    type: "object",
    properties: {
      liked: {
        type: "array",
        items: { type: "string" },
        description: "Brief descriptions of what the user responded to positively.",
      },
      add_topics: {
        type: "array",
        items: { type: "string" },
        description: "New topics, vendors, or content types the user wants added.",
      },
      more_depth_on: {
        type: "array",
        items: { type: "string" },
        description: "Areas where the user wants more detail, numbers, or depth.",
      },
      remove_or_reduce: {
        type: "array",
        items: { type: "string" },
        description: "Anything the user wants less of or removed.",
      },
      summary: {
        type: "string",
        description: "One sentence describing what should change in tomorrow's brief.",
      },
    },
    required: ["liked", "add_topics", "more_depth_on", "remove_or_reduce", "summary"],
  },
};

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function sanitizeFeedbackExtraction(value: unknown): FeedbackExtraction {
  const input = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";

  return {
    liked: sanitizeStringArray(input.liked),
    add_topics: sanitizeStringArray(input.add_topics),
    more_depth_on: sanitizeStringArray(input.more_depth_on),
    remove_or_reduce: sanitizeStringArray(input.remove_or_reduce),
    summary,
  };
}

export async function extractFeedbackSignals({
  feedbackText,
  profileName,
}: {
  feedbackText: string;
  profileName: string;
}): Promise<FeedbackExtraction> {
  const client = getClient();
  const trimmedFeedback = feedbackText.trim();
  const trimmedProfileName = profileName.trim() || "the user";

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    tools: [feedbackTool],
    tool_choice: { type: "tool", name: "extract_feedback_signals" },
    messages: [
      {
        role: "user",
        content: `A user named ${trimmedProfileName} gave this feedback on their morning news brief:

"${trimmedFeedback}"

Extract the user's preference signals for future briefs.`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use" && block.name === "extract_feedback_signals");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Feedback extraction did not return structured output.");
  }

  return sanitizeFeedbackExtraction(toolUse.input);
}
