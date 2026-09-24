"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function syncTimezone(timezone: string) {
  if (!timezone || timezone.length > 100) return;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    return;
  }

  const user = await getCurrentUser();
  if (user.timezone === timezone) return;

  await db.user.update({
    where: { id: user.id },
    data: { timezone },
  });

  revalidatePath("/progress");
}
