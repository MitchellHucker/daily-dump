import { redirect } from "next/navigation";
import { getUserDevMode } from "@/lib/briefCache";
import { syncCurrentUser } from "@/lib/userSync";
import { hasUserProfile } from "@/lib/userProfile";

export default async function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await syncCurrentUser();
  if (!user) redirect("/sign-in");
  const [hasProfile, devMode] = await Promise.all([hasUserProfile(user.id), getUserDevMode(user.id)]);
  if (hasProfile && !devMode) redirect("/brief");

  return children;
}
