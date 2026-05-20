import { getOrFillTodayGeneralNews } from "@/lib/generalNewsCache";
import { syncCurrentUser } from "@/lib/userSync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await syncCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const articles = await getOrFillTodayGeneralNews({ signal: request.signal });
    return Response.json({ articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/general-news failed:", message);
    return Response.json({ articles: [] });
  }
}
