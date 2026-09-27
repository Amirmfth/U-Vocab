"use server";

import { GrammarProgressSource, GrammarProgressStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function startGrammarConceptAction(formData: FormData) {
  const grammarConceptId = String(formData.get("grammarConceptId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!grammarConceptId || !slug) return;

  const user = await getCurrentUser();
  const concept = await db.grammarConcept.findFirst({
    where: { id: grammarConceptId, slug, active: true },
    select: { id: true },
  });
  if (!concept) return;

  const existing = await db.userGrammarProgress.findUnique({
    where: {
      userId_grammarConceptId: {
        userId: user.id,
        grammarConceptId,
      },
    },
  });

  if (existing?.status === GrammarProgressStatus.STRONG) return;

  await db.userGrammarProgress.upsert({
    where: {
      userId_grammarConceptId: {
        userId: user.id,
        grammarConceptId,
      },
    },
    create: {
      userId: user.id,
      grammarConceptId,
      status: GrammarProgressStatus.LEARNING,
      source: GrammarProgressSource.MANUAL,
    },
    update: {
      status: GrammarProgressStatus.LEARNING,
      source:
        existing?.source === GrammarProgressSource.EVIDENCE
          ? GrammarProgressSource.EVIDENCE
          : GrammarProgressSource.MANUAL,
    },
  });

  revalidatePath("/grammar");
  revalidatePath("/grammar/" + slug);
}
