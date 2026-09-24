"use server";

import type { PartOfSpeech, RelationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateWordExpansion } from "@/lib/ai/expand-word";
import { getUniverseBranch } from "@/lib/universe";

export async function expandUniverseNode(input: {
  lexemeId: string;
  includeSemantic?: boolean;
}) {
  const user = await getCurrentUser();
  return getUniverseBranch({
    userId: user.id,
    lexemeId: input.lexemeId,
    includeSemantic: input.includeSemantic,
  });
}

export async function learnUniverseNode(lexemeId: string) {
  const user = await getCurrentUser();
  await db.userVocabulary.upsert({
    where: {
      userId_lexemeId: { userId: user.id, lexemeId },
    },
    create: {
      userId: user.id,
      lexemeId,
      nextReviewAt: new Date(),
    },
    update: {},
  });
  revalidatePath("/universe");
  revalidatePath("/vocabulary");
  return { ok: true };
}

export async function suggestUniverseExpansion(lexemeId: string) {
  const user = await getCurrentUser();
  const lexeme = await db.lexeme.findFirst({
    where: {
      id: lexemeId,
      userStates: { some: { userId: user.id } },
    },
    include: { patterns: true },
  });
  if (!lexeme) throw new Error("Add this word before expanding it with AI.");

  return generateWordExpansion({
    userId: user.id,
    lemma: lexeme.lemma,
    partOfSpeech: lexeme.partOfSpeech,
    patterns: lexeme.patterns.map((item) => item.pattern),
    level: user.targetLevel,
  });
}

export async function addUniverseSuggestion(input: {
  sourceId: string;
  lemma: string;
  partOfSpeech: string;
  article: string | null;
  plural: string | null;
  englishMeaning: string;
  persianMeaning: string;
  relationType: string;
}) {
  const user = await getCurrentUser();
  const source = await db.lexeme.findFirst({
    where: {
      id: input.sourceId,
      userStates: { some: { userId: user.id } },
    },
  });
  if (!source) throw new Error("Source lexical unit not found.");

  const partOfSpeech = input.partOfSpeech as PartOfSpeech;
  const type = input.relationType as RelationType;
  const normalized = input.lemma.toLocaleLowerCase("de-DE").trim();

  const target = await db.lexeme.upsert({
    where: {
      language_normalized_partOfSpeech: {
        language: "de",
        normalized,
        partOfSpeech,
      },
    },
    create: {
      lemma: input.lemma,
      normalized,
      partOfSpeech,
      article: input.article,
      plural: input.plural,
      translations: {
        create: [
          { language: "en", text: input.englishMeaning },
          { language: "fa", text: input.persianMeaning },
        ],
      },
    },
    update: {},
  });

  await db.$transaction([
    db.userVocabulary.upsert({
      where: {
        userId_lexemeId: { userId: user.id, lexemeId: target.id },
      },
      create: {
        userId: user.id,
        lexemeId: target.id,
        nextReviewAt: new Date(),
      },
      update: {},
    }),
    db.lexemeRelation.upsert({
      where: {
        sourceId_targetId_type: {
          sourceId: source.id,
          targetId: target.id,
          type,
        },
      },
      create: {
        sourceId: source.id,
        targetId: target.id,
        type,
      },
      update: {},
    }),
  ]);

  revalidatePath("/universe");
  revalidatePath("/vocabulary");
  return { lexemeId: target.id };
}
