"use server";

import { TranslationLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function updateTranslationPreference(formData: FormData) {
  const value = String(formData.get("translation"));
  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(value)) {
    throw new Error("Invalid translation preference.");
  }

  const user = await getCurrentUser();
  await db.user.update({
    where: { id: user.id },
    data: { preferredTranslation: value as TranslationLanguage },
  });

  revalidatePath("/");
  revalidatePath("/vocabulary");
  revalidatePath("/review");
  revalidatePath("/practice");
  revalidatePath("/settings");
}
