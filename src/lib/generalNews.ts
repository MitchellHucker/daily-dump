import type { Story } from "./types";

/** Cached general headline (post-Haiku). Stored in Supabase `general_news.articles`. */
export type GeneralNewsArticle = {
  headline: string;
  snap: string;
  detail: string;
  url: string;
  source: string;
  origin?: string;
  published_date?: string;
};

export function mapGeneralNewsToStories(articles: GeneralNewsArticle[]): Story[] {
  return articles.map((article) => ({
    headline: article.headline,
    snap: article.snap,
    detail: article.detail,
    take: "",
    source: article.source,
    sourceUrl: article.url,
    sourceDate: article.published_date,
    entities: [],
    ...(article.origin ? { origin: article.origin } : {}),
  }));
}

export function parseGeneralNewsArticles(value: unknown): GeneralNewsArticle[] {
  if (!Array.isArray(value)) return [];

  const articles: GeneralNewsArticle[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const headline = typeof row.headline === "string" ? row.headline.trim() : "";
    const snap = typeof row.snap === "string" ? row.snap.trim() : "";
    const detail = typeof row.detail === "string" ? row.detail.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    const source = typeof row.source === "string" ? row.source.trim() : "";
    if (!headline || !snap || !detail || !url) continue;

    const origin = typeof row.origin === "string" ? row.origin.trim() : "";
    const publishedDate = typeof row.published_date === "string" ? row.published_date.trim() : "";

    articles.push({
      headline,
      snap,
      detail,
      url,
      source: source || sourceLabelFromUrl(url),
      ...(origin ? { origin } : {}),
      ...(publishedDate ? { published_date: publishedDate } : {}),
    });
  }

  return articles;
}

function sourceLabelFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname || url;
  } catch {
    return url;
  }
}
