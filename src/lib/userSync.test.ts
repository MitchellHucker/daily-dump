jest.mock("server-only", () => ({}));

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("./supabase", () => ({
  getSupabaseServiceClient: jest.fn(),
}));

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "./supabase";
import { buildSyncedUser, syncCurrentUser } from "./userSync";

const currentUserMock = currentUser as jest.Mock;
const getSupabaseServiceClientMock = getSupabaseServiceClient as jest.Mock;

function clerkUser(overrides = {}) {
  return {
    id: "user_123",
    primaryEmailAddressId: "email_1",
    emailAddresses: [{ id: "email_1", emailAddress: "person@example.com" }],
    fullName: "Person Example",
    firstName: "Person",
    lastName: "Example",
    ...overrides,
  };
}

function supabaseMock({ existingUser }: { existingUser: { id: string } | null }) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existingUser, error: null });
  const selectEq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq: selectEq });

  const updateEq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });

  const insert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ select, update, insert });

  return {
    client: { from },
    from,
    select,
    selectEq,
    maybeSingle,
    update,
    updateEq,
    insert,
  };
}

describe("user sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("builds a synced user from Clerk identity", () => {
    expect(buildSyncedUser(clerkUser())).toEqual({
      id: "user_123",
      email: "person@example.com",
      name: "Person Example",
    });
  });

  test("falls back to first email and email prefix when Clerk has no name", () => {
    expect(
      buildSyncedUser(
        clerkUser({
          primaryEmailAddressId: null,
          emailAddresses: [{ id: "email_2", emailAddress: "fallback@example.com" }],
          fullName: null,
          firstName: null,
          lastName: null,
        }),
      ),
    ).toEqual({
      id: "user_123",
      email: "fallback@example.com",
      name: "fallback",
    });
  });

  test("returns null without touching Supabase when no Clerk user is signed in", async () => {
    currentUserMock.mockResolvedValue(null);

    await expect(syncCurrentUser()).resolves.toBeNull();
    expect(getSupabaseServiceClientMock).not.toHaveBeenCalled();
  });

  test("inserts a new Supabase user with dev_mode false", async () => {
    currentUserMock.mockResolvedValue(clerkUser());
    const db = supabaseMock({ existingUser: null });
    getSupabaseServiceClientMock.mockReturnValue(db.client);

    await expect(syncCurrentUser()).resolves.toEqual({
      id: "user_123",
      email: "person@example.com",
      name: "Person Example",
    });

    expect(db.insert).toHaveBeenCalledWith({
      id: "user_123",
      email: "person@example.com",
      name: "Person Example",
      dev_mode: false,
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  test("updates an existing Supabase user without overwriting dev_mode", async () => {
    currentUserMock.mockResolvedValue(clerkUser({ fullName: "Updated Name" }));
    const db = supabaseMock({ existingUser: { id: "user_123" } });
    getSupabaseServiceClientMock.mockReturnValue(db.client);

    await syncCurrentUser();

    expect(db.update).toHaveBeenCalledWith({
      email: "person@example.com",
      name: "Updated Name",
    });
    expect(db.updateEq).toHaveBeenCalledWith("id", "user_123");
    expect(db.insert).not.toHaveBeenCalled();
  });
});
