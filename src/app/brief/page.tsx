import { BriefClient } from "./BriefClient";
import { syncCurrentUser } from "@/lib/userSync";

export default async function BriefPage() {
  await syncCurrentUser();
  return <BriefClient />;
}

