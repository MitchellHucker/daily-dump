import { redirect } from "next/navigation";
import { syncCurrentUser } from "@/lib/userSync";
import { hasUserProfile } from "@/lib/userProfile";

export default async function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await syncCurrentUser();
  if (!user) redirect("/sign-in");
  /** Signed-in users with a saved profile always continue to brief — dev_mode does not exempt this (dev tooling lives on `/brief`). */
  if (await hasUserProfile(user.id)) redirect("/brief");

  return children;
}
