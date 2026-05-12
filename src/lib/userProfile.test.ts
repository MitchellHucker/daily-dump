jest.mock("server-only", () => ({}));

jest.mock("./supabase", () => ({
  getSupabaseServiceClient: jest.fn(),
}));

import { getSupabaseServiceClient } from "./supabase";
import { getUserProfile, hasUserProfile, saveUserProfile } from "./userProfile";

const getSupabaseServiceClientMock = getSupabaseServiceClient as jest.Mock;

function queryMock(response: unknown) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn().mockResolvedValue(response),
    insert: jest.fn(() => query),
    update: jest.fn(() => query),
    single: jest.fn().mockResolvedValue(response),
  };
  return query;
}

describe("user profile helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches and sanitizes the latest user profile", async () => {
    const query = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        topics: [{ id: "technology", label: "Wrong", interests: ["AI", "Nope"], lens: " Lens " }],
        updated_at: "2026-05-06T08:00:00Z",
      },
      error: null,
    });
    getSupabaseServiceClientMock.mockReturnValue({ from: jest.fn(() => query) });

    await expect(getUserProfile("user_1")).resolves.toEqual({
      id: "profile_1",
      user_id: "user_1",
      topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "Lens" }],
      overview: null,
      updated_at: "2026-05-06T08:00:00Z",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user_1");
  });

  test("reports whether a user has saved topics", async () => {
    const query = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        topics: [{ id: "technology", interests: [], lens: "" }],
        updated_at: null,
      },
      error: null,
    });
    getSupabaseServiceClientMock.mockReturnValue({ from: jest.fn(() => query) });

    await expect(hasUserProfile("user_1")).resolves.toBe(true);
  });

  test("inserts a new profile when one does not exist", async () => {
    const readQuery = queryMock({ data: null, error: null });
    const writeQuery = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
        overview: null,
        updated_at: "2026-05-06T08:00:00Z",
      },
      error: null,
    });
    const from = jest.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(writeQuery);
    getSupabaseServiceClientMock.mockReturnValue({ from });

    await saveUserProfile("user_1", [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }]);

    expect(writeQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_1",
        topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
        overview: null,
      }),
    );
  });

  test("updates an existing profile row", async () => {
    const readQuery = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        topics: [{ id: "technology", label: "Technology", interests: [], lens: "" }],
        overview: "Keep me",
        updated_at: "2026-05-06T08:00:00Z",
      },
      error: null,
    });
    const writeQuery = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        topics: [{ id: "finance", label: "Finance", interests: ["Markets"], lens: "" }],
        updated_at: "2026-05-06T09:00:00Z",
      },
      error: null,
    });
    const from = jest.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(writeQuery);
    getSupabaseServiceClientMock.mockReturnValue({ from });

    await saveUserProfile("user_1", [{ id: "finance", label: "Finance", interests: ["Markets"], lens: "" }]);

    expect(writeQuery.update).toHaveBeenCalledWith({
      topics: [{ id: "finance", label: "Finance", interests: ["Markets"], lens: "" }],
      updated_at: expect.any(String),
    });
    expect(writeQuery.eq).toHaveBeenCalledWith("id", "profile_1");
  });

  test("stores overview when provided on insert", async () => {
    const readQuery = queryMock({ data: null, error: null });
    const writeQuery = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        overview: "I love news.",
        topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
        updated_at: "2026-05-06T08:00:00Z",
      },
      error: null,
    });
    const from = jest.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(writeQuery);
    getSupabaseServiceClientMock.mockReturnValue({ from });

    await saveUserProfile(
      "user_1",
      [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
      { overview: "I love news." },
    );

    expect(writeQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        overview: "I love news.",
      }),
    );
  });

  test("writes overview when provided on update", async () => {
    const readQuery = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        topics: [{ id: "technology", label: "Technology", interests: [], lens: "" }],
        overview: null,
        updated_at: "2026-05-06T08:00:00Z",
      },
      error: null,
    });
    const writeQuery = queryMock({
      data: {
        id: "profile_1",
        user_id: "user_1",
        overview: "Updated blurb.",
        topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
        updated_at: "2026-05-06T09:00:00Z",
      },
      error: null,
    });
    const from = jest.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(writeQuery);
    getSupabaseServiceClientMock.mockReturnValue({ from });

    await saveUserProfile(
      "user_1",
      [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
      { overview: "Updated blurb." },
    );

    expect(writeQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        overview: "Updated blurb.",
        topics: [{ id: "technology", label: "Technology", interests: ["AI"], lens: "" }],
        updated_at: expect.any(String),
      }),
    );
  });
});
