import { POST } from "./route";

jest.mock("@/lib/anthropic", () => ({
  generateBrief: jest.fn(),
}));

import { generateBrief } from "@/lib/anthropic";

describe("/api/generate route", () => {
  test("returns 400 for missing profileId", async () => {
    const res = await POST({ json: async () => ({}) } as unknown as Request);
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid profileId", async () => {
    const res = await POST({ json: async () => ({ profileId: "preview" }) } as unknown as Request);
    expect(res.status).toBe(400);
  });

  test("returns 200 and brief on success", async () => {
    (generateBrief as jest.Mock).mockResolvedValueOnce({ sections: [] });
    const res = await POST({ json: async () => ({ profileId: "mitchell" }) } as unknown as Request);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ brief: { sections: [] } });
  });

  test("returns 500 when generation throws", async () => {
    (generateBrief as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    const res = await POST({ json: async () => ({ profileId: "ralitsa" }) } as unknown as Request);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toContain("boom");
  });
});

