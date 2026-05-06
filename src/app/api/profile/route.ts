import { MAX_ONBOARDING_TOPICS, sanitizeTopicPreferences, TOPIC_OPTIONS } from "@/lib/onboarding";
import { getUserDevMode } from "@/lib/briefCache";
import { syncCurrentUser } from "@/lib/userSync";
import { getUserProfile, saveUserProfile } from "@/lib/userProfile";

export const dynamic = "force-dynamic";

type ProfileBody = {
  topics?: unknown;
};

export async function GET() {
  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [profile, devMode] = await Promise.all([getUserProfile(user.id), getUserDevMode(user.id)]);
  return Response.json({ profile, devMode, maxTopics: devMode ? TOPIC_OPTIONS.length : MAX_ONBOARDING_TOPICS });
}

export async function POST(request: Request) {
  let body: ProfileBody = {};
  try {
    body = (await request.json()) as ProfileBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const devMode = await getUserDevMode(user.id);
  const maxTopics = devMode ? TOPIC_OPTIONS.length : MAX_ONBOARDING_TOPICS;
  const topics = sanitizeTopicPreferences(body.topics, maxTopics);
  if (topics.length === 0) {
    return Response.json({ error: "Select at least one topic." }, { status: 400 });
  }

  const profile = await saveUserProfile(user.id, topics, { maxTopics });
  return Response.json({ profile });
}
