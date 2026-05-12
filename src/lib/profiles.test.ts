import { buildUserProfileProfile, PROFILES } from "./profiles";

describe("profiles prompt builder", () => {
  test("Mitchell prompt includes expected section headers", () => {
    const prompt = PROFILES.mitchell.prompt("FORMAT");
    expect(prompt).toContain("Write a morning brief for Mitchell");
    expect(prompt).toContain("SECTION: ⚡ | AI & Tech | tech");
    expect(prompt).toContain("SECTION: ⚖️ | LegalTech | legaltech");
    expect(prompt).toContain("SECTION: 💳 | FinTech | fintech");
  });

  test("Ralitsa prompt includes expected section headers", () => {
    const prompt = PROFILES.ralitsa.prompt("FORMAT");
    expect(prompt).toContain("Write a morning brief for Ralitsa");
    expect(prompt).toContain("SECTION: 🏢 | Vendor Watch | vendors");
    expect(prompt).toContain("SECTION: 🖥️ | IT & Procurement | procurement");
    expect(prompt).toContain("SECTION: 🤖 | AI at Enterprise Scale | ai");
  });

  test("Preview prompt is empty", () => {
    expect(PROFILES.preview.prompt("FORMAT")).toBe("");
  });

  test("dynamic user profile prompt uses selected topics without hardcoded defaults", () => {
    const profile = buildUserProfileProfile({
      name: "Avery Example",
      topics: [
        { id: "technology", label: "Technology", interests: ["AI"], lens: "LegalTech startups" },
        { id: "finance", label: "Finance", interests: [], lens: "" },
      ],
    });

    expect(profile.sections).toEqual([
      { id: "technology", icon: "⚡", label: "Technology" },
      { id: "finance", icon: "📈", label: "Finance" },
    ]);
    expect(profile.prompt()).toContain("Write a morning brief for Avery Example");
    expect(profile.prompt()).toContain("SECTION: ⚡ | Technology | technology");
    expect(profile.prompt()).toContain("Interests: AI");
    expect(profile.prompt()).toContain("Lens: LegalTech startups");
    expect(profile.prompt()).toContain("Broad general coverage for this topic");
  });

  test("dynamic user profile prompt prefixes User context when overview is set", () => {
    const profile = buildUserProfileProfile({
      name: "Avery Example",
      topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
      overview: "PM in London who cares about UK tech policy.",
    });

    expect(profile.prompt()).toContain("User context: PM in London who cares about UK tech policy.");
    expect(profile.prompt()).toContain("SECTION: ⚡ | Technology | technology");
  });

  test("dynamic user profile prompt omits User context when overview is absent", () => {
    const profile = buildUserProfileProfile({
      name: "Avery Example",
      topics: [{ id: "finance", label: "Finance", interests: [], lens: "" }],
      overview: null,
    });

    expect(profile.prompt()).not.toContain("User context:");
  });
});

