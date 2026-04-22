import { generateBrief } from "@/lib/anthropic";
import type { ProfileId } from "@/lib/profiles";

export const runtime = "nodejs";

type GenerateBody = {
  profileId?: string;
};

const REAL_PROFILE_IDS = new Set<ProfileId>(["mitchell", "ralitsa"]);

export async function POST(request: Request) {
  let body: GenerateBody = {};
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const profileId = body.profileId;
  if (!profileId || typeof profileId !== "string") {
    return Response.json({ error: "Missing profileId." }, { status: 400 });
  }
  if (!REAL_PROFILE_IDS.has(profileId as ProfileId)) {
    return Response.json({ error: "Invalid profileId." }, { status: 400 });
  }

  try {
    const brief = await generateBrief(profileId as ProfileId);
    return Response.json({ brief }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

