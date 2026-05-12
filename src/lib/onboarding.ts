export type TopicOption = {
  id: string;
  label: string;
  icon: string;
  interests: string[];
};

export type ProfileTopicPreference = {
  id: string;
  label: string;
  interests: string[];
  lens: string;
};

export const MAX_ONBOARDING_TOPICS = 3;

export const TOPIC_OPTIONS: TopicOption[] = [
  { id: "technology", label: "Technology", icon: "⚡", interests: ["AI", "Startups", "LegalTech", "FinTech", "Hardware", "Cybersecurity", "Crypto", "Space Tech"] },
  { id: "politics", label: "Politics", icon: "🏛️", interests: ["UK Politics", "US Politics", "EU Politics", "Elections", "Policy", "Regulation"] },
  { id: "finance", label: "Finance", icon: "📈", interests: ["Markets", "Investing", "Venture Capital", "Crypto", "Banking", "Personal Finance"] },
  { id: "science", label: "Science", icon: "🔬", interests: ["Climate", "Health", "Physics", "Biology", "Space", "Research"] },
  { id: "law", label: "Law", icon: "⚖️", interests: ["Regulation", "LegalTech", "Compliance", "International Law", "Corporate Law"] },
  { id: "geopolitics", label: "Geopolitics", icon: "🌍", interests: ["International Relations", "Trade", "Conflict", "Diplomacy", "Sanctions"] },
  { id: "environment", label: "Environment", icon: "🌱", interests: ["Climate", "Energy Transition", "Conservation", "Policy"] },
  { id: "education", label: "Education", icon: "🎓", interests: ["Higher Education", "EdTech", "Policy", "Skills"] },
  { id: "business", label: "Business", icon: "💼", interests: ["Strategy", "M&A", "Startups", "Leadership", "Operations"] },
  { id: "health", label: "Health", icon: "🩺", interests: ["Public Health", "MedTech", "Mental Health", "Policy", "Research"] },
  { id: "sport", label: "Sport", icon: "🏟️", interests: ["Football", "Rugby", "Tennis", "Cricket", "Olympics"] },
  { id: "defence", label: "Defence", icon: "🛡️", interests: ["Military", "NATO", "Intelligence", "Cybersecurity", "Procurement"] },
  { id: "energy", label: "Energy", icon: "⚡", interests: ["Oil & Gas", "Renewables", "Nuclear", "Supply Chain", "Policy"] },
  { id: "media", label: "Media", icon: "📰", interests: ["Publishing", "Broadcasting", "Social Media", "Advertising"] },
  { id: "property", label: "Property", icon: "🏘️", interests: ["Residential", "Commercial", "REITs", "Planning", "Mortgages"] },
  { id: "space", label: "Space", icon: "🚀", interests: ["Exploration", "Satellites", "Launch", "Policy", "Commercial"] },
  { id: "hobbies", label: "Hobbies", icon: "🎲", interests: ["Gaming", "Sport", "Music", "Film & TV", "Books", "Food & Drink", "Travel", "Fitness", "Cars"] },
];

export const TOPIC_OPTIONS_BY_ID = Object.fromEntries(TOPIC_OPTIONS.map((topic) => [topic.id, topic])) as Record<string, TopicOption>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEmptyTopicPreference(topicId: string): ProfileTopicPreference | null {
  const topic = TOPIC_OPTIONS_BY_ID[topicId];
  if (!topic) return null;
  return {
    id: topic.id,
    label: topic.label,
    interests: [],
    lens: "",
  };
}

export function sanitizeTopicPreferences(value: unknown, maxTopics = MAX_ONBOARDING_TOPICS): ProfileTopicPreference[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const preferences: ProfileTopicPreference[] = [];

  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") continue;
    const topic = TOPIC_OPTIONS_BY_ID[item.id];
    if (!topic || seen.has(topic.id)) continue;

    const allowedInterests = new Set(topic.interests);
    const interests = Array.isArray(item.interests)
      ? item.interests.filter((interest): interest is string => typeof interest === "string" && allowedInterests.has(interest))
      : [];

    preferences.push({
      id: topic.id,
      label: topic.label,
      interests: [...new Set(interests)],
      lens: typeof item.lens === "string" ? item.lens.trim() : "",
    });
    seen.add(topic.id);

    if (preferences.length >= maxTopics) break;
  }

  return preferences;
}

/** Session draft keys shared by onboarding screens. */
export const ONBOARDING_DRAFT_STORAGE_KEY = "dailyDumpOnboardingDraft";
export const ONBOARDING_OVERVIEW_STORAGE_KEY = "dailyDumpOnboardingOverview";
/** "1" when extraction fell back to defaults — review UI may surface a banner. */
export const ONBOARDING_NEEDS_REVIEW_STORAGE_KEY = "dailyDumpOnboardingNeedsReview";
