import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "./supabase";

type ClerkEmailAddress = {
  id: string;
  emailAddress: string;
};

type ClerkUserForSync = {
  id: string;
  primaryEmailAddressId: string | null;
  emailAddresses: ClerkEmailAddress[];
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
};

type SyncedUser = {
  id: string;
  email: string;
  name: string;
};

function getPrimaryEmail(user: ClerkUserForSync) {
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) throw new Error("Signed-in Clerk user has no email address.");
  return primaryEmail;
}

function getDisplayName(user: ClerkUserForSync, email: string) {
  const joinedName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.fullName?.trim() || joinedName || email.split("@")[0] || "Daily Dump user";
}

export function buildSyncedUser(user: ClerkUserForSync): SyncedUser {
  const email = getPrimaryEmail(user);
  return {
    id: user.id,
    email,
    name: getDisplayName(user, email),
  };
}

export async function syncCurrentUser() {
  const user = await currentUser();
  if (!user) return null;

  const syncedUser = buildSyncedUser(user);
  const supabase = getSupabaseServiceClient();

  const { data: existingUser, error: readError } = await supabase
    .from("users")
    .select("id")
    .eq("id", syncedUser.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read synced user: ${readError.message}`);
  }

  const query = existingUser
    ? supabase.from("users").update({ email: syncedUser.email, name: syncedUser.name }).eq("id", syncedUser.id)
    : supabase.from("users").insert({ ...syncedUser, dev_mode: false });

  const { error: writeError } = await query;
  if (writeError) {
    throw new Error(`Failed to sync Clerk user to Supabase: ${writeError.message}`);
  }

  return syncedUser;
}
