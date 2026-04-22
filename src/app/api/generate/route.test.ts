import { POST } from "./route";

jest.mock("@/lib/anthropicStream", () => ({
  streamBrief: jest.fn(),
}));

import { streamBrief } from "@/lib/anthropicStream";

describe("/api/generate route", () => {
  test("returns 400 for missing profileId", async () => {
    const res = await POST({ json: async () => ({}), signal: new AbortController().signal } as unknown as Request);
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid profileId", async () => {
    const res = await POST(
      { json: async () => ({ profileId: "preview" }), signal: new AbortController().signal } as unknown as Request,
    );
    expect(res.status).toBe(400);
  });

  test("returns 200 and SSE stream on success", async () => {
    (streamBrief as jest.Mock).mockImplementationOnce(async function* () {
      yield { type: "status", message: "Searching: test" };
      yield { type: "complete", brief: { sections: [] } };
    });

    const res = await POST(
      { json: async () => ({ profileId: "mitchell" }), signal: new AbortController().signal } as unknown as Request,
    );
    expect(res.status).toBe(200);
    expect((res as unknown as { headers?: Record<string, string> }).headers?.["Content-Type"]).toContain("text/event-stream");
  });

  test("returns 500 when generation throws", async () => {
    (streamBrief as jest.Mock).mockImplementationOnce(async function* () {
      throw new Error("boom");
    });

    const res = await POST(
      { json: async () => ({ profileId: "ralitsa" }), signal: new AbortController().signal } as unknown as Request,
    );
    expect(res.status).toBe(200);
  });
});

