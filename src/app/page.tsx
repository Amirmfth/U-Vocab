import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AUTHENTICATED_ROOT_DESTINATION } from "@/lib/navigation";
import { onboardingComplete } from "@/lib/onboarding";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(onboardingComplete(user) ? AUTHENTICATED_ROOT_DESTINATION : "/onboarding");
}
