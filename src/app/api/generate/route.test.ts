import { POST } from "./route";

jest.mock("@/lib/anthropicStream", () => ({
  streamBrief: jest.fn(),
}));
jest.mock("@/lib/userSync", () => ({
  syncCurrentUser: jest.fn(),
}));
jest.mock("@/lib/briefCache", () => ({
  getTodayBrief: jest.fn(),
  getUserDevMode: jest.fn(),
  getUtcDateKey: jest.fn(),
  saveTodayBrief: jest.fn(),
}));
jest.mock("@/lib/userProfile", () => ({
  getUserProfile: jest.fn(),
}));

import { streamBrief } from "@/lib/anthropicStream";
import { getTodayBrief, getUserDevMode, getUtcDateKey, saveTodayBrief } from "@/lib/briefCache";
import { syncCurrentUser } from "@/lib/userSync";
import { getUserProfile } from "@/lib/userProfile";

const streamBriefMock = streamBrief as jest.Mock;
const syncCurrentUserMock = syncCurrentUser as jest.Mock;
const getTodayBriefMock = getTodayBrief as jest.Mock;
const getUserDevModeMock = getUserDevMode as jest.Mock;
const getUtcDateKeyMock = getUtcDateKey as jest.Mock;
const saveTodayBriefMock = saveTodayBrief as jest.Mock;
const getUserProfileMock = getUserProfile as jest.Mock;

async function readResponseBody(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

describe("/api/generate route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    syncCurrentUserMock.mockResolvedValue({ id: "user_123", email: "person@example.com", name: "Person" });
    getTodayBriefMock.mockResolvedValue(null);
    getUserDevModeMock.mockResolvedValue(false);
    getUtcDateKeyMock.mockReturnValue("2026-05-06");
    saveTodayBriefMock.mockResolvedValue(null);
    getUserProfileMock.mockResolvedValue({
      id: "profile_1",
      user_id: "user_123",
      topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "LegalTech startups" }],
      updated_at: "2026-05-06T08:00:00Z",
    });
  });

  test("returns 409 when no stored profile exists", async () => {
    getUserProfileMock.mockResolvedValue(null);

    const res = await POST({ json: async () => ({}), signal: new AbortController().signal } as unknown as Request);
    expect(res.status).toBe(409);
  });

  test("returns 400 for invalid profileId", async () => {
    const res = await POST(
      { json: async () => ({ profileId: "preview" }), signal: new AbortController().signal } as unknown as Request,
    );
    expect(res.status).toBe(400);
  });

  test("rejects hardcoded profile selection when the user is not in dev mode", async () => {
    const res = await POST(
      { json: async () => ({ profileId: "mitchell" }), signal: new AbortController().signal } as unknown as Request,
    );

    expect(res.status).toBe(403);
  });

  test("returns 401 when no Clerk user is signed in", async () => {
    syncCurrentUserMock.mockResolvedValue(null);

    const res = await POST({ json: async () => ({}), signal: new AbortController().signal } as unknown as Request);

    expect(res.status).toBe(401);
  });

  test("returns 200 and SSE stream on success", async () => {
    streamBriefMock.mockImplementationOnce(async function* () {
      yield { type: "status", message: "Searching: test" };
      yield {
        type: "complete",
        brief: {
          sections: [
            {
              id: "tech",
              icon: "⚡",
              label: "AI & Tech",
              stories: [
                {
                  headline: "Headline",
                  snap: "Snap",
                  detail: "Detail",
                  take: "Take",
                  source: "Source",
                  sourceDate: "",
                  entities: ["A"],
                },
              ],
            },
          ],
        },
      };
    });

    const res = await POST({ json: async () => ({}), signal: new AbortController().signal } as unknown as Request);
    expect(res.status).toBe(200);
    expect((res as unknown as { headers?: Record<string, string> }).headers?.["Content-Type"]).toContain("text/event-stream");

    const body = await readResponseBody(res);
    expect(body).toContain("event: complete");
    expect(saveTodayBriefMock).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ sections: expect.any(Array) }),
      "2026-05-06",
    );
  });

  test("streams cached brief without generating when today's cache exists", async () => {
    getTodayBriefMock.mockResolvedValue({
      content: {
        sections: [
          {
            id: "cached",
            icon: "C",
            label: "Cached",
            stories: [],
          },
        ],
      },
    });

    const res = await POST({ json: async () => ({}), signal: new AbortController().signal } as unknown as Request);

    const body = await readResponseBody(res);
    expect(body).toContain("Loaded today's cached brief.");
    expect(body).toContain('"id":"cached"');
    expect(streamBriefMock).not.toHaveBeenCalled();
    expect(saveTodayBriefMock).not.toHaveBeenCalled();
  });

  test("rejects force regenerate when the user is not in dev mode", async () => {
    const res = await POST(
      {
        json: async () => ({ forceRegenerate: true }),
        signal: new AbortController().signal,
      } as unknown as Request,
    );

    expect(res.status).toBe(403);
  });

  test("force regenerate skips cache read and saves a new row when dev mode is enabled", async () => {
    getUserDevModeMock.mockResolvedValue(true);
    streamBriefMock.mockImplementationOnce(async function* () {
      yield {
        type: "complete",
        brief: {
          sections: [
            {
              id: "tech",
              icon: "T",
              label: "Tech",
              stories: [{ headline: "Headline", snap: "Snap", detail: "Detail", take: "Take", source: "Source", sourceDate: "", entities: [] }],
            },
          ],
        },
      };
    });

    const res = await POST(
      {
        json: async () => ({ forceRegenerate: true }),
        signal: new AbortController().signal,
      } as unknown as Request,
    );

    await readResponseBody(res);
    expect(getTodayBriefMock).not.toHaveBeenCalled();
    expect(saveTodayBriefMock).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ sections: expect.any(Array) }),
      "2026-05-06",
    );
  });

  test("returns 500 when generation throws", async () => {
    streamBriefMock.mockImplementationOnce(async function* () {
      throw new Error("boom");
    });

    const res = await POST(
      { json: async () => ({}), signal: new AbortController().signal } as unknown as Request,
    );
    expect(res.status).toBe(200);
    await expect(readResponseBody(res)).resolves.toContain("event: error");
  });
});

