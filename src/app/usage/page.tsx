import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";

export default async function UsageRedirectPage() {
  await requireAdmin();
  redirect("/admin/usage");
}
