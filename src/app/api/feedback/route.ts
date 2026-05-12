import { extractFeedbackSignals } from "@/lib/feedbackExtraction";
import { syncCurrentUser } from "@/lib/userSync";

export const dynamic = "force-dynamic";

type FeedbackBody = {
  feedbackText?: unknown;
  profileName?: unknown;
};

export async function POST(request: Request) {
  let body: FeedbackBody = {};
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (typeof body.feedbackText !== "string" || !body.feedbackText.trim()) {
    return Response.json({ error: "Feedback text is required." }, { status: 400 });
  }

  if (typeof body.profileName !== "string" || !body.profileName.trim()) {
    return Response.json({ error: "Profile name is required." }, { status: 400 });
  }

  const extraction = await extractFeedbackSignals({
    feedbackText: body.feedbackText,
    profileName: body.profileName,
  });

  return Response.json({ extraction });
}
