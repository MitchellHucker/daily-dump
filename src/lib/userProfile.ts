import "server-only";

import { MAX_ONBOARDING_TOPICS, sanitizeTopicPreferences, type ProfileTopicPreference } from "./onboarding";
import { getSupabaseServiceClient } from "./supabase";

export type UserProfile = {
  id: string;
  user_id: string | null;
  topics: ProfileTopicPreference[];
  updated_at: string | null;
};

type ProfileRow = Omit<UserProfile, "topics"> & {
  topics: unknown;
};

function toUserProfile(row: ProfileRow | null): UserProfile | null {
  if (!row) return null;
  return {
    ...row,
    topics: sanitizeTopicPreferences(row.topics),
  };
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,user_id,topics,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch user profile: ${error.message}`);
  return toUserProfile(data);
}

export async function hasUserProfile(userId: string) {
  const profile = await getUserProfile(userId);
  return Boolean(profile && profile.topics.length > 0);
}

export async function saveUserProfile(
  userId: string,
  topics: ProfileTopicPreference[],
  { maxTopics = MAX_ONBOARDING_TOPICS }: { maxTopics?: number } = {},
) {
  const sanitizedTopics = sanitizeTopicPreferences(topics, maxTopics);
  if (sanitizedTopics.length === 0) {
    throw new Error("At least one topic is required.");
  }

  const existingProfile = await getUserProfile(userId);
  const supabase = getSupabaseServiceClient();
  const updatedAt = new Date().toISOString();
  const query = existingProfile
    ? supabase
        .from("profiles")
        .update({
          topics: sanitizedTopics,
          updated_at: updatedAt,
        })
        .eq("id", existingProfile.id)
    : supabase.from("profiles").insert({
        user_id: userId,
        topics: sanitizedTopics,
        updated_at: updatedAt,
      });

  const { data, error } = await query.select("id,user_id,topics,updated_at").single();
  if (error) throw new Error(`Failed to save user profile: ${error.message}`);

  return toUserProfile(data);
}
