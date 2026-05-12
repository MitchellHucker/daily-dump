import { extractOnboardingTopicsFromDescription } from "@/lib/onboardingExtraction";
import { syncCurrentUser } from "@/lib/userSync";

export const dynamic = "force-dynamic";

type ExtractBody = {
  overview?: unknown;
};

export async function POST(request: Request) {
  let body: ExtractBody = {};
  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (typeof body.overview !== "string" || !body.overview.trim()) {
    return Response.json({ error: "Tell us a bit about yourself before continuing." }, { status: 400 });
  }

  try {
    const { topics, needsReview } = await extractOnboardingTopicsFromDescription(body.overview, {
      signal: request.signal,
    });
    return Response.json({ topics, needsReview });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 502 });
  }
}
