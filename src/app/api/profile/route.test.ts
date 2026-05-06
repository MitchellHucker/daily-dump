import { GET, POST } from "./route";

jest.mock("@/lib/userSync", () => ({
  syncCurrentUser: jest.fn(),
}));
jest.mock("@/lib/userProfile", () => ({
  getUserProfile: jest.fn(),
  saveUserProfile: jest.fn(),
}));
jest.mock("@/lib/briefCache", () => ({
  getUserDevMode: jest.fn(),
}));

import { getUserDevMode } from "@/lib/briefCache";
import { syncCurrentUser } from "@/lib/userSync";
import { getUserProfile, saveUserProfile } from "@/lib/userProfile";

const syncCurrentUserMock = syncCurrentUser as jest.Mock;
const getUserProfileMock = getUserProfile as jest.Mock;
const saveUserProfileMock = saveUserProfile as jest.Mock;
const getUserDevModeMock = getUserDevMode as jest.Mock;

describe("/api/profile route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    syncCurrentUserMock.mockResolvedValue({ id: "user_123", email: "person@example.com", name: "Person" });
    getUserDevModeMock.mockResolvedValue(false);
  });

  test("returns 401 when no user is signed in", async () => {
    syncCurrentUserMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  test("returns the current user's profile", async () => {
    const profile = {
      id: "profile_1",
      user_id: "user_123",
      topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
      updated_at: "2026-05-06T08:00:00Z",
    };
    getUserProfileMock.mockResolvedValue(profile);

    const res = await GET();
    const body = await res.json();

    expect(body.profile).toEqual(profile);
    expect(body.devMode).toBe(false);
    expect(body.maxTopics).toBe(3);
    expect(getUserProfileMock).toHaveBeenCalledWith("user_123");
  });

  test("saves sanitized onboarding topics", async () => {
    const profile = {
      id: "profile_1",
      user_id: "user_123",
      topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "Startups" }],
      updated_at: "2026-05-06T08:00:00Z",
    };
    saveUserProfileMock.mockResolvedValue(profile);

    const res = await POST({
      json: async () => ({
        topics: [{ id: "technology", interests: ["AI", "Not allowed"], lens: " Startups " }],
      }),
    } as unknown as Request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.profile).toEqual(profile);
    expect(saveUserProfileMock).toHaveBeenCalledWith(
      "user_123",
      [{ id: "technology", label: "Technology", interests: ["AI"], lens: "Startups" }],
      { maxTopics: 3 },
    );
  });

  test("allows dev users to save more than three topics", async () => {
    getUserDevModeMock.mockResolvedValue(true);
    saveUserProfileMock.mockResolvedValue({
      id: "profile_1",
      user_id: "user_123",
      topics: [],
      updated_at: "2026-05-06T08:00:00Z",
    });

    const res = await POST({
      json: async () => ({
        topics: [
          { id: "technology", interests: [], lens: "" },
          { id: "finance", interests: [], lens: "" },
          { id: "science", interests: [], lens: "" },
          { id: "business", interests: [], lens: "" },
        ],
      }),
    } as unknown as Request);

    expect(res.status).toBe(200);
    expect(saveUserProfileMock).toHaveBeenCalledWith(
      "user_123",
      [
        { id: "technology", label: "Technology", interests: [], lens: "" },
        { id: "finance", label: "Finance", interests: [], lens: "" },
        { id: "science", label: "Science", interests: [], lens: "" },
        { id: "business", label: "Business", interests: [], lens: "" },
      ],
      { maxTopics: 17 },
    );
  });

  test("rejects empty topic selections", async () => {
    const res = await POST({ json: async () => ({ topics: [] }) } as unknown as Request);

    expect(res.status).toBe(400);
    expect(saveUserProfileMock).not.toHaveBeenCalled();
  });
});
