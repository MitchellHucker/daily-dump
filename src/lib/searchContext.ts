import type { Profile, ProfileSection } from "./profiles";
import type { TopicResults } from "./tavily";

const DEFAULT_DAYS = 2;

const SECTION_QUERIES: Record<string, string> = {
  "mitchell:tech": "AI artificial intelligence technology news today",
  "mitchell:legaltech": "legal technology LegalTech AI law regulation news",
  "mitchell:fintech": "fintech financial technology startup regulation news",
  "mitchell:markets": "stock market investing macro economics news today",
  "mitchell:geo": "geopolitics international relations world news today",
  "mitchell:australia": "Australia visa immigration skilled worker news 2026",
  "ralitsa:vendors": "enterprise software vendor pricing Broadcom Microsoft Oracle SAP news",
  "ralitsa:procurement": "IT procurement outsourcing enterprise technology category management news",
  "ralitsa:supply": "semiconductor chip supply chain hardware shortage enterprise news",
  "ralitsa:geo": "tariffs sanctions trade policy supply chain risk UK insurance news",
  "ralitsa:insurance": "insurance industry regulatory risk news UK",
  "ralitsa:ai": "enterprise AI artificial intelligence adoption cost IT strategy news",
};

export type SearchPlanItem = {
  section: ProfileSection;
  query: string;
  days: number;
};

export function buildSearchQuery(section: ProfileSection, profile: Profile): string {
  return SECTION_QUERIES[`${profile.id}:${section.id}`] ?? `${section.label} news today`;
}

export function buildSearchPlan(profile: Profile): SearchPlanItem[] {
  return profile.sections.map((section) => ({
    section,
    query: buildSearchQuery(section, profile),
    days: DEFAULT_DAYS,
  }));
}

export function formatResultsForPrompt(topicResults: TopicResults[]): string {
  return topicResults
    .map((topic) => {
      if (topic.results.length === 0) {
        return `### ${topic.topic}\nNo fresh articles available - omit this section entirely from the brief.`;
      }

      const articles = topic.results
        .map((result, index) => {
          const dateLine = result.published_date ? `\nDate: ${result.published_date}` : "";
          return `[${index + 1}] ${result.title}\nURL: ${result.url}${dateLine}\nSummary: ${result.content}`;
        })
        .join("\n\n");

      return `### ${topic.topic}\n${articles}`;
    })
    .join("\n\n---\n\n");
}
