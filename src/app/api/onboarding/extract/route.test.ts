import { POST } from "./route";

jest.mock("@/lib/userSync", () => ({
  syncCurrentUser: jest.fn(),
}));
jest.mock("@/lib/onboardingExtraction", () => ({
  extractOnboardingTopicsFromDescription: jest.fn(),
}));

import { extractOnboardingTopicsFromDescription } from "@/lib/onboardingExtraction";
import { syncCurrentUser } from "@/lib/userSync";

const syncCurrentUserMock = syncCurrentUser as jest.Mock;
const extractMock = extractOnboardingTopicsFromDescription as jest.Mock;

describe("/api/onboarding/extract route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    syncCurrentUserMock.mockResolvedValue({ id: "user_123", email: "person@example.com", name: "Person" });
    extractMock.mockResolvedValue({
      topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
      needsReview: false,
    });
  });

  test("returns 401 when not signed in", async () => {
    syncCurrentUserMock.mockResolvedValue(null);
    const res = await POST({
      json: async () => ({ overview: "Hello" }),
      signal: new AbortController().signal,
    } as unknown as Request);
    expect(res.status).toBe(401);
    expect(extractMock).not.toHaveBeenCalled();
  });

  test("returns 400 when overview is empty", async () => {
    const res = await POST({
      json: async () => ({ overview: "  " }),
      signal: new AbortController().signal,
    } as unknown as Request);
    expect(res.status).toBe(400);
    expect(extractMock).not.toHaveBeenCalled();
  });

  test("returns topics and needsReview from extraction", async () => {
    const res = await POST({
      json: async () => ({ overview: "PM in London." }),
      signal: new AbortController().signal,
    } as unknown as Request);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.topics).toEqual([{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }]);
    expect(body.needsReview).toBe(false);
    expect(extractMock).toHaveBeenCalledWith("PM in London.", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
