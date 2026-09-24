"use server";

import { TranslationLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function setTranslationMode(mode: string) {
  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(mode)) return;

  const user = await getCurrentUser();
  await db.user.update({
    where: { id: user.id },
    data: { preferredTranslation: mode as TranslationLanguage },
  });

  revalidatePath("/");
  revalidatePath("/vocabulary");
  revalidatePath("/review");
  revalidatePath("/practice");
}
