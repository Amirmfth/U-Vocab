import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AUTHENTICATED_ROOT_DESTINATION } from "@/lib/navigation";

export default async function Home() {
  await getCurrentUser();
  redirect(AUTHENTICATED_ROOT_DESTINATION);
}
