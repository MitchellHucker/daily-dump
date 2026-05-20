import "server-only";

import { getUtcDateKey } from "./briefCache";
import { parseGeneralNewsArticles, type GeneralNewsArticle } from "./generalNews";
import { synthesizeGeneralHeadlines } from "./generalNewsSynthesis";
import { getSupabaseServiceClient } from "./supabase";
import { fetchGeneralHeadlines } from "./tavily";

type GeneralNewsRow = {
  id: string;
  date: string;
  articles: unknown;
  created_at: string | null;
};

function toArticles(row: GeneralNewsRow | null): GeneralNewsArticle[] {
  if (!row) return [];
  return parseGeneralNewsArticles(row.articles);
}

export async function getTodayGeneralNews(date = getUtcDateKey()) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("general_news")
    .select("id,date,articles,created_at")
    .eq("date", date)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch general news: ${error.message}`);
  return toArticles(data);
}

export async function upsertTodayGeneralNews(articles: GeneralNewsArticle[], date = getUtcDateKey()) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("general_news")
    .upsert(
      {
        date,
        articles,
      },
      { onConflict: "date" },
    )
    .select("id,date,articles,created_at")
    .single();

  if (error) throw new Error(`Failed to save general news: ${error.message}`);
  return toArticles(data);
}

export async function getOrFillTodayGeneralNews(options: { signal?: AbortSignal; date?: string } = {}) {
  const date = options.date ?? getUtcDateKey();
  const cached = await getTodayGeneralNews(date);
  if (cached.length > 0) return cached;

  const rawResults = await fetchGeneralHeadlines({ signal: options.signal });
  if (rawResults.length === 0) return [];

  try {
    const polished = await synthesizeGeneralHeadlines(rawResults, { signal: options.signal });
    if (polished.length === 0) return [];
    return upsertTodayGeneralNews(polished, date);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("General news synthesis failed; not caching:", message);
    return [];
  }
}
