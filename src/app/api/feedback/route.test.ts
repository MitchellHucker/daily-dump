import { POST } from "./route";

jest.mock("@/lib/userSync", () => ({
  syncCurrentUser: jest.fn(),
}));
jest.mock("@/lib/feedbackExtraction", () => ({
  extractFeedbackSignals: jest.fn(),
}));

import { extractFeedbackSignals } from "@/lib/feedbackExtraction";
import { syncCurrentUser } from "@/lib/userSync";

const syncCurrentUserMock = syncCurrentUser as jest.Mock;
const extractFeedbackSignalsMock = extractFeedbackSignals as jest.Mock;

describe("/api/feedback route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    syncCurrentUserMock.mockResolvedValue({ id: "user_123", email: "person@example.com", name: "Person" });
    extractFeedbackSignalsMock.mockResolvedValue({
      liked: ["AI coverage"],
      add_topics: ["More legal tech"],
      more_depth_on: [],
      remove_or_reduce: [],
      summary: "Add more legal tech tomorrow.",
    });
  });

  test("returns 401 when no user is signed in", async () => {
    syncCurrentUserMock.mockResolvedValue(null);

    const res = await POST({
      json: async () => ({ feedbackText: "More AI please", profileName: "Person" }),
    } as unknown as Request);

    expect(res.status).toBe(401);
    expect(extractFeedbackSignalsMock).not.toHaveBeenCalled();
  });

  test("rejects empty feedback", async () => {
    const res = await POST({
      json: async () => ({ feedbackText: " ", profileName: "Person" }),
    } as unknown as Request);

    expect(res.status).toBe(400);
    expect(extractFeedbackSignalsMock).not.toHaveBeenCalled();
  });

  test("rejects missing profile name", async () => {
    const res = await POST({
      json: async () => ({ feedbackText: "More AI please", profileName: "" }),
    } as unknown as Request);

    expect(res.status).toBe(400);
    expect(extractFeedbackSignalsMock).not.toHaveBeenCalled();
  });

  test("returns extracted feedback signals", async () => {
    const res = await POST({
      json: async () => ({ feedbackText: "More AI please", profileName: "Person" }),
    } as unknown as Request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.extraction).toEqual({
      liked: ["AI coverage"],
      add_topics: ["More legal tech"],
      more_depth_on: [],
      remove_or_reduce: [],
      summary: "Add more legal tech tomorrow.",
    });
    expect(extractFeedbackSignalsMock).toHaveBeenCalledWith({
      feedbackText: "More AI please",
      profileName: "Person",
    });
  });
});
