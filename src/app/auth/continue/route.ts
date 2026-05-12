import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/userSync";
import { hasUserProfile } from "@/lib/userProfile";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await syncCurrentUser();
  const url = new URL(request.url);

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const destination = (await hasUserProfile(user.id)) ? "/brief" : "/onboarding";
  return NextResponse.redirect(new URL(destination, url));
}
