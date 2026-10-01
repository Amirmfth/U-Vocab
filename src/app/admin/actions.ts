"use server";

import { revalidatePath } from "next/cache";
import { LexemeAliasKind, LexemeReviewState, PartOfSpeech } from "@prisma/client";
import {
  grantAdminEntitlement,
  revokeAdminEntitlement,
  revokeUserSessions,
} from "@/lib/admin/users";
import {
  addLexemeAliasAsAdmin,
  mergeLexemesAsAdmin,
  removeLexemeAliasAsAdmin,
  setLexemeReviewStateAsAdmin,
  updateLexemeAsAdmin,
} from "@/lib/admin/lexicon";
import { requireAdmin } from "@/lib/admin/auth";

function dateOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date.");
  return date;
}

export async function grantEntitlementAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  await grantAdminEntitlement({
    userId,
    endsAt: dateOrNull(formData.get("endsAt")),
    reason: String(formData.get("reason") ?? "") || null,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users/" + userId);
  revalidatePath("/admin/subscriptions");
}

export async function revokeEntitlementAction(formData: FormData) {
  await requireAdmin();
  const grantId = String(formData.get("grantId") ?? "");
  await revokeAdminEntitlement(grantId);
  revalidatePath("/admin/subscriptions");
}

export async function revokeSessionsAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  await revokeUserSessions(userId);
  revalidatePath("/admin/users/" + userId);
}

export async function updateLexemeAction(formData: FormData) {
  await requireAdmin();
  const lexemeId = String(formData.get("lexemeId") ?? "");
  await updateLexemeAsAdmin(lexemeId, {
    lemma: String(formData.get("lemma") ?? ""),
    article: String(formData.get("article") ?? "") || null,
    plural: String(formData.get("plural") ?? "") || null,
    gender: String(formData.get("gender") ?? "") || null,
    cefrLevel: String(formData.get("cefrLevel") ?? "") || null,
    partOfSpeech: String(formData.get("partOfSpeech") ?? "") as PartOfSpeech,
  });
  revalidatePath("/admin/lexicon");
}

export async function addAliasAction(formData: FormData) {
  await requireAdmin();
  await addLexemeAliasAsAdmin({
    lexemeId: String(formData.get("lexemeId") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    kind: (String(formData.get("kind") ?? "SPELLING_VARIANT") as LexemeAliasKind),
  });
  revalidatePath("/admin/lexicon");
}

export async function removeAliasAction(formData: FormData) {
  await requireAdmin();
  await removeLexemeAliasAsAdmin(String(formData.get("aliasId") ?? ""));
  revalidatePath("/admin/lexicon");
}

export async function reviewLexemeAction(formData: FormData) {
  await requireAdmin();
  await setLexemeReviewStateAsAdmin(
    String(formData.get("lexemeId") ?? ""),
    String(formData.get("reviewState") ?? "ACCEPTED") as LexemeReviewState,
  );
  revalidatePath("/admin/lexicon");
}

export async function mergeLexemeAction(formData: FormData) {
  await requireAdmin();
  await mergeLexemesAsAdmin(
    String(formData.get("sourceLexemeId") ?? ""),
    String(formData.get("targetLexemeId") ?? ""),
  );
  revalidatePath("/admin/lexicon");
}
