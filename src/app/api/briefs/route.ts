import { getLatestBriefs, getTodayBrief, getUserDevMode, getUtcDateKey } from "@/lib/briefCache";
import { syncCurrentUser } from "@/lib/userSync";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const todayDate = getUtcDateKey();
  const [todayBrief, latestBriefs, devMode] = await Promise.all([
    getTodayBrief(user.id, todayDate),
    getLatestBriefs(user.id, 2),
    getUserDevMode(user.id),
  ]);
  const currentBrief = latestBriefs[0] ?? null;
  const previousBrief = latestBriefs[1] ?? null;

  return Response.json({
    date: todayDate,
    todayBrief,
    currentBrief,
    previousBrief,
    devMode,
  });
}
