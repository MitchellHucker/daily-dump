import { PROFILES } from "./profiles";

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
});

