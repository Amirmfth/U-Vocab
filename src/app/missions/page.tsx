import { redirect } from "next/navigation";

export default function MissionsPage() {
  redirect("/conversation?mode=MISSION");
}
