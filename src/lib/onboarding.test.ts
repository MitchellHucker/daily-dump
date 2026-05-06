import { MAX_ONBOARDING_TOPICS, sanitizeTopicPreferences, TOPIC_OPTIONS } from "./onboarding";

describe("onboarding topic helpers", () => {
  test("includes hobbies as a selectable topic", () => {
    expect(TOPIC_OPTIONS.map((topic) => topic.label)).toContain("Hobbies");
  });

  test("sanitizes topics, interests, and lens text", () => {
    expect(
      sanitizeTopicPreferences([
        { id: "technology", label: "Wrong label", interests: ["AI", "Not allowed"], lens: " LegalTech " },
        { id: "technology", interests: ["Startups"], lens: "duplicate" },
        { id: "unknown", interests: [], lens: "" },
      ]),
    ).toEqual([{ id: "technology", label: "Technology", interests: ["AI"], lens: "LegalTech" }]);
  });

  test("limits saved topics to the free tier maximum", () => {
    const saved = sanitizeTopicPreferences(TOPIC_OPTIONS.map((topic) => ({ id: topic.id, interests: [], lens: "" })));

    expect(saved).toHaveLength(MAX_ONBOARDING_TOPICS);
  });
});
