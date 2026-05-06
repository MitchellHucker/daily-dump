import { streamBrief } from "@/lib/anthropicStream";
import { getTodayBrief, getUserDevMode, getUtcDateKey, saveTodayBrief } from "@/lib/briefCache";
import { buildUserProfileProfile, type Profile, type ProfileId } from "@/lib/profiles";
import { syncCurrentUser } from "@/lib/userSync";
import { getUserProfile } from "@/lib/userProfile";
import { validateBrief } from "@/lib/validateBrief";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type GenerateBody = {
  profileId?: string;
  forceRegenerate?: boolean;
};

const REAL_PROFILE_IDS = new Set<ProfileId>(["mitchell", "ralitsa"]);

function sseEvent(event: string, data: string) {
  // SSE frame: event + data + blank line terminator
  return `event: ${event}\ndata: ${data}\n\n`;
}

export async function POST(request: Request) {
  let body: GenerateBody = {};
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const profileId = body.profileId;
  if (profileId !== undefined && typeof profileId !== "string") {
    return Response.json({ error: "Invalid profileId." }, { status: 400 });
  }

  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const forceRegenerate = body.forceRegenerate === true;
  const todayDate = getUtcDateKey();
  const devMode = await getUserDevMode(user.id);

  if (forceRegenerate && !devMode) {
    return Response.json({ error: "Force regenerate is only available in dev mode." }, { status: 403 });
  }

  let generationProfile: ProfileId | Profile;
  if (profileId) {
    if (!REAL_PROFILE_IDS.has(profileId as ProfileId)) {
      return Response.json({ error: "Invalid profileId." }, { status: 400 });
    }
    if (!devMode) {
      return Response.json({ error: "Profile selection is only available in dev mode." }, { status: 403 });
    }
    generationProfile = profileId as ProfileId;
  } else {
    const storedProfile = await getUserProfile(user.id);
    if (!storedProfile || storedProfile.topics.length === 0) {
      return Response.json({ error: "Complete onboarding before generating a brief." }, { status: 409 });
    }
    generationProfile = buildUserProfileProfile({ name: user.name, topics: storedProfile.topics });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Immediately send a status frame to prove streaming works.
      // (If the client never receives this until the end, we know it's buffering/client-side.)
      try {
        const frame = sseEvent("status", "Starting…");
        controller.enqueue(encoder.encode(frame));
      } catch {
        // ignore
      }

      const abort = () => {
        try {
          controller.close();
        } catch {
          // ignore
        }
      };
      request.signal.addEventListener("abort", abort);

      (async () => {
        try {
          if (!forceRegenerate) {
            const cachedBrief = await getTodayBrief(user.id, todayDate);
            if (cachedBrief) {
              controller.enqueue(encoder.encode(sseEvent("status", "Loaded today's cached brief.")));
              controller.enqueue(encoder.encode(sseEvent("complete", JSON.stringify(cachedBrief.content))));
              controller.close();
              return;
            }
          }

          for await (const ev of streamBrief(generationProfile, { signal: request.signal })) {
            if (ev.type === "status") {
              const frame = sseEvent("status", ev.message);
              controller.enqueue(encoder.encode(frame));
            } else if (ev.type === "complete") {
              const validated = validateBrief(ev.brief);
              await saveTodayBrief(user.id, validated, todayDate);
              const payload = JSON.stringify(validated);
              const frame = sseEvent("complete", payload);
              controller.enqueue(encoder.encode(frame));
              controller.close();
              return;
            }
          }
          controller.close();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          try {
            controller.enqueue(encoder.encode(sseEvent("error", msg)));
          } catch {
            // If the client disconnected, the controller may already be closed.
          }
          controller.close();
        } finally {
          request.signal.removeEventListener("abort", abort);
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Helps prevent proxy buffering in some environments.
      "X-Accel-Buffering": "no",
    },
  });
}

