"use server";

import { TranslationLanguage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentCourse } from "@/lib/current-course";

export async function setTranslationMode(mode: string) {
  if (!["ENGLISH", "PERSIAN", "BOTH"].includes(mode)) return;

  const course = await getCurrentCourse();
  await db.userCourse.update({
    where: { id: course.id },
    data: { explanationLanguage: mode as TranslationLanguage },
  });

  revalidatePath("/");
  revalidatePath("/vocabulary");
  revalidatePath("/review");
  revalidatePath("/practice");
  revalidatePath("/settings");
}
