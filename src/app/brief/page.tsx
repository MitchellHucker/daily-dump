import { BriefClient } from "./BriefClient";
import { redirect } from "next/navigation";
import { syncCurrentUser } from "@/lib/userSync";
import { hasUserProfile } from "@/lib/userProfile";

export default async function BriefPage() {
  const user = await syncCurrentUser();
  if (!user) redirect("/sign-in");
  if (!(await hasUserProfile(user.id))) redirect("/onboarding/topics");

  return <BriefClient />;
}

