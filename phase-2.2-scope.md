# Daily Dump — Phase 2.2 Scope

## What we are building

Replacing the free-text line-prefixed output format with structured JSON output via Anthropic's tool use API. Adding a validation and sanitisation layer on the backend before the response is returned to the frontend. The frontend receives clean, validated, typed data — never raw AI output.

This phase fixes a known production issue: stories are rendering pre-expanded because the SNAP field is returning empty or malformed, causing the parser to fail silently and bleed detail text into the collapsed view.

No new features. No UI changes beyond fixing the broken collapsed/expanded behaviour. The brief should look and behave exactly as intended — this is a data pipeline fix.

---

## Why we are changing the approach

The free-text format (SECTION: / HEADLINE: / SNAP: etc.) was chosen to avoid JSON escape character failures. It solved that problem but introduced a different one: the parser does string matching on line prefixes, so any variation in model output — an extra space, a missing field, a line break mid-value — silently corrupts the parsed data with no error surfaced to the user.

The screenshots showing pre-expanded stories are evidence of this in production. SNAP is coming back empty or missing, so the collapsed state has nothing to show and detail text renders directly.

**The correct fix is Anthropic's tool use for structured output.** This is fundamentally different from asking the model to write its own JSON:

- Previously: model writes JSON as free text in its response → escape characters and formatting variations break `JSON.parse()`
- Now: a JSON schema is defined as a tool → the model fills in typed fields → the Anthropic SDK handles all escaping automatically → the output is guaranteed to match the schema shape

The model cannot return malformed field values — the API enforces the structure. This eliminates the entire class of parse failures we have been working around.

---

## Changes required

### 1. `src/lib/anthropic.ts` — switch to tool use

Define the brief schema as an Anthropic tool. The model is instructed to call this tool with the brief data rather than writing free text.

The tool schema:

```typescript
const briefTool: Anthropic.Tool = {
  name: "deliver_brief",
  description: "Deliver the structured morning brief",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id:    { type: "string" },
            icon:  { type: "string" },
            label: { type: "string" },
            stories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "Punchy headline, max 12 words" },
                  snap:     { type: "string", description: "One sentence, max 20 words. The whole story in one hit." },
                  detail:   { type: "string", description: "2-3 sentences. Balanced, multiple angles. Specific figures where available." },
                  take:     { type: "string", description: "One sentence starting with the person's name followed by a colon. Why this matters for them." },
                  source:   { type: "string", description: "Source name(s)" },
                  entities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Max 3 named companies, products, or topics"
                  }
                },
                required: ["headline", "snap", "detail", "take", "source", "entities"]
              }
            }
          },
          required: ["id", "icon", "label", "stories"]
        }
      }
    },
    required: ["sections"]
  }
};
```

The API call must use `tool_choice: { type: "tool", name: "deliver_brief" }` to force the model to use the tool rather than respond in free text:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 6000,
  tools: [
    { type: "web_search_20250305", name: "web_search" },
    briefTool
  ],
  tool_choice: { type: "tool", name: "deliver_brief" },
  messages: [{ role: "user", content: prompt }],
});
```

Extract the tool result from the response:

```typescript
const toolUse = response.content.find(
  (block) => block.type === "tool_use" && block.name === "deliver_brief"
);

if (!toolUse || toolUse.type !== "tool_use") {
  throw new Error("Model did not return a structured brief.");
}

const raw = toolUse.input as BriefResponse;
```

**Note on streaming:** tool use with `tool_choice: auto` streams differently. Since we force a specific tool, streaming status messages (web search queries) still work — they come through as `tool_use` blocks for `web_search` before the `deliver_brief` tool use block. The streaming logic in the route needs to be updated to distinguish between web search tool use events (surface as status) and the deliver_brief tool use event (the final payload). See the streaming section below.

---

### 2. `src/app/api/generate/route.ts` — add validation layer

After extracting the tool result, validate and sanitise before returning to the frontend. Do not return raw AI output.

```typescript
function validateBrief(raw: unknown): BriefResponse {
  // 1. Confirm top-level shape
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).sections)) {
    throw new Error("Invalid brief structure returned from model.");
  }

  const brief = raw as BriefResponse;

  // 2. Validate and sanitise each section and story
  brief.sections = brief.sections
    .filter(sec => sec.id && sec.label && Array.isArray(sec.stories))
    .map(sec => ({
      ...sec,
      stories: sec.stories
        .filter(story => story.headline && story.snap)
        .map(story => ({
          headline: story.headline.trim(),
          snap:     story.snap.trim(),
          detail:   (story.detail || "").trim(),
          take:     (story.take || "").trim(),
          source:   (story.source || "").trim(),
          entities: Array.isArray(story.entities) ? story.entities.slice(0, 3) : [],
        }))
    }))
    .filter(sec => sec.stories.length > 0);

  if (brief.sections.length === 0) {
    throw new Error("Brief contained no valid sections after validation.");
  }

  return brief;
}
```

This ensures:
- Missing optional fields default to empty strings rather than undefined (prevents frontend crashes)
- Entities are capped at 3 even if the model returns more
- Empty sections and stories without minimum required fields are dropped cleanly
- A brief with zero valid sections throws a catchable error rather than rendering a broken UI

---

### 3. Update streaming logic for tool use

The current streaming implementation listens for `tool_use` events to extract web search queries for status messages. With `deliver_brief` now also a tool, the streaming handler needs to filter by tool name:

- `tool_use` block where `name === "web_search"` → extract input query → send as `event: status`
- `tool_use` block where `name === "deliver_brief"` → extract input → validate → send as `event: complete`

The streaming approach changes slightly with forced tool use. The `deliver_brief` tool input arrives as a complete block at the end of the stream — it does not stream token by token. Web search tool uses still fire as discrete events during generation and can still be surfaced as status messages.

---

### 4. Remove `src/lib/parser.ts`

The plain-text parser is no longer needed once tool use is in place. Delete the file and remove all imports. If Cursor flags tests that reference it, those tests should be updated to test the validation function instead.

---

### 5. Update prompt wording

The profile prompts no longer need format instructions — the tool schema defines the output structure. Remove the `FORMAT_INSTRUCTIONS` block and the instruction to use the line-prefixed text format. The prompts should focus solely on content: who the user is, what sections to cover, and what quality of output is expected per field.

Keep field-level guidance in the tool schema `description` properties — the model reads these and uses them to fill each field correctly.

---

## TypeScript types to define

Add to `src/lib/types.ts` (create this file):

```typescript
export interface Story {
  headline: string;
  snap: string;
  detail: string;
  take: string;
  source: string;
  entities: string[];
}

export interface Section {
  id: string;
  icon: string;
  label: string;
  stories: Story[];
}

export interface BriefResponse {
  sections: Section[];
}
```

Import and use these types throughout `anthropic.ts`, `route.ts`, and the frontend components. This gives TypeScript visibility into the data shape end to end — if a field goes missing, the compiler flags it rather than it silently failing at runtime.

---

## What does not change

- All UI components (StoryCard, BriefView, ProfileBar etc.) — untouched, they already consume the section/story structure
- The streaming status message UI — still shows web search queries during generation
- Profile definitions and prompt content — only the format instructions are removed
- Preview/stub profile — still resolves instantly from STUB_BRIEF, no changes needed
- Error handling UI — same error states, just more precise error messages from the validation layer

---

## Definition of done

- [ ] `briefTool` schema defined in `src/lib/anthropic.ts`
- [ ] API call uses `tool_choice` to force `deliver_brief` tool
- [ ] Tool result extracted correctly from response content blocks
- [ ] `validateBrief()` function in place in the route — called before returning to frontend
- [ ] Streaming correctly distinguishes web search events (status) from deliver_brief event (complete)
- [ ] `src/lib/parser.ts` removed
- [ ] `FORMAT_INSTRUCTIONS` removed from prompts
- [ ] TypeScript types defined in `src/lib/types.ts` and used throughout
- [ ] Stories render collapsed by default — headline + snap visible, detail hidden
- [ ] Expanding a story shows detail, take, source, and entity tags correctly
- [ ] Preview/stub profile unaffected
- [ ] No TypeScript errors (`npm run build` passes cleanly)
- [ ] Tested on both Mitchell and Ralitsa profiles
- [ ] Committed and pushed to GitHub