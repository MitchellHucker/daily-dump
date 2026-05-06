import "server-only";

import type { BriefResponse } from "./types";
import { getSupabaseServiceClient } from "./supabase";

export type CachedBrief = {
  id: string;
  user_id: string | null;
  content: BriefResponse;
  generated_at: string | null;
  date: string;
};

type BriefRow = Omit<CachedBrief, "content"> & {
  content: unknown;
};

export function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toCachedBrief(row: BriefRow | null): CachedBrief | null {
  if (!row) return null;
  return {
    ...row,
    content: row.content as BriefResponse,
  };
}

export async function getTodayBrief(userId: string, date = getUtcDateKey()) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("briefs")
    .select("id,user_id,content,generated_at,date")
    .eq("user_id", userId)
    .eq("date", date)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch today's brief: ${error.message}`);
  return toCachedBrief(data);
}

export async function getPreviousBrief(userId: string, todayDate = getUtcDateKey()) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("briefs")
    .select("id,user_id,content,generated_at,date")
    .eq("user_id", userId)
    .lt("date", todayDate)
    .order("date", { ascending: false })
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch previous brief: ${error.message}`);
  return toCachedBrief(data);
}

export async function getLatestBriefs(userId: string, limit = 2) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("briefs")
    .select("id,user_id,content,generated_at,date")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch latest briefs: ${error.message}`);
  return (data ?? []).map((row) => toCachedBrief(row)).filter((brief): brief is CachedBrief => brief !== null);
}

export async function saveTodayBrief(userId: string, brief: BriefResponse, date = getUtcDateKey()) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("briefs")
    .insert({
      user_id: userId,
      content: brief,
      date,
    })
    .select("id,user_id,content,generated_at,date")
    .single();

  if (error) throw new Error(`Failed to save today's brief: ${error.message}`);
  return toCachedBrief(data);
}

export async function getUserDevMode(userId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("users").select("dev_mode").eq("id", userId).maybeSingle();

  if (error) throw new Error(`Failed to fetch user dev mode: ${error.message}`);
  return Boolean(data?.dev_mode);
}
