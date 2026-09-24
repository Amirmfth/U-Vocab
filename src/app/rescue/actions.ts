"use server";

import type { ExerciseType } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { applyReviewResult } from "@/lib/review-service";
import type { ReviewGrade } from "@/lib/fsrs";

function safeDuration(value: FormDataEntryValue | null) {
  const startedAt = Number(value);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
  return Math.max(0, Math.min(Date.now() - startedAt, 30 * 60 * 1000));
}

export async function submitRescueReview(formData: FormData) {
  const id = String(formData.get("userVocabularyId") ?? "");
  const grade = String(formData.get("grade") ?? "") as ReviewGrade;
  const exerciseType = String(
    formData.get("exerciseType") ?? "MEANING_RECALL",
  ) as ExerciseType;
  const prompt = String(formData.get("prompt") ?? "Rescue this lexical unit.");
  const ids = String(formData.get("ids") ?? "");
  const step = Math.max(0, Number(formData.get("step") ?? 0));

  if (!id || !["AGAIN", "HARD", "GOOD", "EASY"].includes(grade)) {
    throw new Error("Invalid rescue review.");
  }

  const user = await getCurrentUser();
  await applyReviewResult({
    userId: user.id,
    userVocabularyId: id,
    grade,
    exerciseType,
    prompt,
    durationMs: safeDuration(formData.get("startedAt")),
  });

  redirect("/rescue?ids=" + encodeURIComponent(ids) + "&step=" + (step + 1));
}
