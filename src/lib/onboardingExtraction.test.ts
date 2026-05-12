jest.mock("server-only", () => ({}));

import { mergeExtractedTopics } from "./onboardingExtraction";

describe("mergeExtractedTopics", () => {
  test("sanitises Haiku-shaped tool output", () => {
    const topics = mergeExtractedTopics({
      topics: [
        { id: "technology", interests: ["AI", "Nope"], lens: " Startup lens " },
        { id: "geopolitics", interests: ["International Relations"], lens: "UK angle" },
      ],
    });
    expect(topics).toEqual([
      { id: "technology", label: "Technology", interests: ["AI"], lens: "Startup lens" },
      { id: "geopolitics", label: "Geopolitics", interests: ["International Relations"], lens: "UK angle" },
    ]);
  });

  test("returns Phase 3.1 defaults when nothing parses", () => {
    const topics = mergeExtractedTopics({ topics: [{ id: "nope", interests: [], lens: "" }] });
    expect(topics.map((t) => t.id)).toEqual(["technology", "geopolitics", "finance"]);
  });

  test("accepts a raw array for tests and tooling", () => {
    const topics = mergeExtractedTopics([{ id: "finance", interests: ["Markets"], lens: "rates" }]);
    expect(topics).toEqual([{ id: "finance", label: "Finance", interests: ["Markets"], lens: "rates" }]);
  });
});
