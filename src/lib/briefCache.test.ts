jest.mock("server-only", () => ({}));

jest.mock("./supabase", () => ({
  getSupabaseServiceClient: jest.fn(),
}));

import { getSupabaseServiceClient } from "./supabase";
import { getLatestBriefs, getTodayBrief, getUtcDateKey, saveTodayBrief } from "./briefCache";

const getSupabaseServiceClientMock = getSupabaseServiceClient as jest.Mock;

function queryMock(response: unknown) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn().mockResolvedValue(response),
    insert: jest.fn(() => query),
    single: jest.fn().mockResolvedValue(response),
    then: jest.fn((resolve, reject) => Promise.resolve(response).then(resolve, reject)),
  };
  return query;
}

describe("brief cache helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("builds a UTC date key", () => {
    expect(getUtcDateKey(new Date("2026-05-06T23:59:59.000Z"))).toBe("2026-05-06");
    expect(getUtcDateKey(new Date("2026-05-07T00:00:00.000Z"))).toBe("2026-05-07");
  });

  test("fetches today's brief by user and UTC date", async () => {
    const row = {
      id: "brief_1",
      user_id: "user_1",
      content: { sections: [] },
      generated_at: "2026-05-06T08:00:00Z",
      date: "2026-05-06",
    };
    const query = queryMock({ data: row, error: null });
    getSupabaseServiceClientMock.mockReturnValue({ from: jest.fn(() => query) });

    await expect(getTodayBrief("user_1", "2026-05-06")).resolves.toEqual(row);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user_1");
    expect(query.eq).toHaveBeenCalledWith("date", "2026-05-06");
    expect(query.order).toHaveBeenCalledWith("generated_at", { ascending: false });
  });

  test("saves today's brief without setting generated_at manually", async () => {
    const brief = { sections: [] };
    const query = queryMock({
      data: {
        id: "brief_1",
        user_id: "user_1",
        content: brief,
        generated_at: "2026-05-06T08:00:00Z",
        date: "2026-05-06",
      },
      error: null,
    });
    getSupabaseServiceClientMock.mockReturnValue({ from: jest.fn(() => query) });

    await saveTodayBrief("user_1", brief, "2026-05-06");
    expect(query.insert).toHaveBeenCalledWith({
      user_id: "user_1",
      content: brief,
      date: "2026-05-06",
    });
  });

  test("fetches latest briefs by generated time", async () => {
    const rows = [
      {
        id: "brief_2",
        user_id: "user_1",
        content: { sections: [] },
        generated_at: "2026-05-06T09:00:00Z",
        date: "2026-05-06",
      },
      {
        id: "brief_1",
        user_id: "user_1",
        content: { sections: [] },
        generated_at: "2026-05-06T08:00:00Z",
        date: "2026-05-06",
      },
    ];
    const query = queryMock({ data: rows, error: null });
    getSupabaseServiceClientMock.mockReturnValue({ from: jest.fn(() => query) });

    await expect(getLatestBriefs("user_1", 2)).resolves.toEqual(rows);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user_1");
    expect(query.order).toHaveBeenCalledWith("generated_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(2);
  });
});
