"use server";

import type { PartOfSpeech, RelationType, VocabularyState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateLexicalInsight } from "@/lib/ai/lexical-insight";
import { generateWordExpansion } from "@/lib/ai/expand-word";

export type InsightActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type ExpansionSuggestion = {
  lemma: string;
  partOfSpeech: string;
  article: string | null;
  plural: string | null;
  englishMeaning: string;
  persianMeaning: string;
  relationType: string;
  rationale: string;
  usefulness: number;
  existingLexemeId: string | null;
  userState: VocabularyState | null;
};

export type ExpansionState = {
  status: "idle" | "success" | "error";
  message?: string;
  suggestions?: ExpansionSuggestion[];
};

export async function generateInsightAction(
  _previous: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");
  const compareWith = String(formData.get("compareWith") ?? "").trim() || null;

  try {
    const user = await getCurrentUser();
    const lexeme = await db.lexeme.findFirst({
      where: {
        id: lexemeId,
        userStates: { some: { userId: user.id } },
      },
      include: { patterns: true },
    });

    if (!lexeme) {
      return { status: "error", message: "This lexical unit is not in your vocabulary." };
    }

    const result = await generateLexicalInsight({
      userId: user.id,
      lemma: lexeme.lemma,
      article: lexeme.article,
      plural: lexeme.plural,
      partOfSpeech: lexeme.partOfSpeech,
      patterns: lexeme.patterns.map((pattern) => pattern.pattern),
      level: user.targetLevel,
      compareWith,
    });

    await db.$transaction(async (tx) => {
      await tx.lexemeInsight.upsert({
        where: {
          lexemeId_level: {
            lexemeId: lexeme.id,
            level: user.targetLevel,
          },
        },
        create: {
          lexemeId: lexeme.id,
          level: user.targetLevel,
          germanDefinition: result.germanDefinition,
          englishExplanation: result.englishExplanation,
          persianExplanation: result.persianExplanation,
          grammarNotes: result.grammarNotes,
          comparisonTarget: result.comparisonTarget,
          comparisonNotes: result.comparisonNotes,
        },
        update: {
          germanDefinition: result.germanDefinition,
          englishExplanation: result.englishExplanation,
          persianExplanation: result.persianExplanation,
          grammarNotes: result.grammarNotes,
          comparisonTarget: result.comparisonTarget,
          comparisonNotes: result.comparisonNotes,
          version: { increment: 1 },
        },
      });

      const existingExamples = await tx.example.findMany({
        where: { lexemeId: lexeme.id },
        select: { german: true },
      });
      const seen = new Set(
        existingExamples.map((example) =>
          example.german.toLocaleLowerCase("de-DE").trim(),
        ),
      );

      const newExamples = result.examples.filter(
        (example) =>
          !seen.has(example.german.toLocaleLowerCase("de-DE").trim()),
      );

      if (newExamples.length) {
        await tx.example.createMany({
          data: newExamples.map((example) => ({
            lexemeId: lexeme.id,
            german: example.german,
            english: example.english,
            persian: example.persian,
            level: user.targetLevel,
            generatedByAi: true,
          })),
        });
      }
    });

    revalidatePath(`/vocabulary/${lexeme.id}`);
    revalidatePath(`/vocabulary/${lexeme.id}/teach`);

    return {
      status: "success",
      message: compareWith
        ? "Explanation and comparison regenerated."
        : "Contextual explanation regenerated.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not generate this explanation.",
    };
  }
}

export async function generateExpansionAction(
  _previous: ExpansionState,
  formData: FormData,
): Promise<ExpansionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");

  try {
    const user = await getCurrentUser();
    const lexeme = await db.lexeme.findFirst({
      where: {
        id: lexemeId,
        userStates: { some: { userId: user.id } },
      },
      include: { patterns: true },
    });

    if (!lexeme) {
      return { status: "error", message: "This lexical unit is not in your vocabulary." };
    }

    const result = await generateWordExpansion({
      userId: user.id,
      lemma: lexeme.lemma,
      partOfSpeech: lexeme.partOfSpeech,
      patterns: lexeme.patterns.map((pattern) => pattern.pattern),
      level: user.targetLevel,
    });

    const suggestions = await Promise.all(
      result.suggestions
        .sort((a, b) => b.usefulness - a.usefulness)
        .map(async (suggestion) => {
          const existing = await db.lexeme.findUnique({
            where: {
              language_normalized_partOfSpeech: {
                language: "de",
                normalized: suggestion.lemma.toLocaleLowerCase("de-DE"),
                partOfSpeech: suggestion.partOfSpeech,
              },
            },
            include: {
              userStates: {
                where: { userId: user.id },
                select: { state: true },
                take: 1,
              },
            },
          });

          return {
            ...suggestion,
            existingLexemeId: existing?.id ?? null,
            userState: existing?.userStates[0]?.state ?? null,
          };
        }),
    );

    return { status: "success", suggestions };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not expand this word.",
    };
  }
}

export async function addExpansionAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");
  const lemma = String(formData.get("lemma") ?? "").trim();
  const partOfSpeech = String(formData.get("partOfSpeech") ?? "") as PartOfSpeech;
  const article = String(formData.get("article") ?? "").trim() || null;
  const plural = String(formData.get("plural") ?? "").trim() || null;
  const englishMeaning = String(formData.get("englishMeaning") ?? "").trim();
  const persianMeaning = String(formData.get("persianMeaning") ?? "").trim();
  const relationType = String(formData.get("relationType") ?? "") as RelationType;

  const user = await getCurrentUser();
  const source = await db.lexeme.findFirst({
    where: {
      id: sourceId,
      userStates: { some: { userId: user.id } },
    },
  });
  if (!source) throw new Error("Source vocabulary item not found.");

  const normalized = lemma.toLocaleLowerCase("de-DE");
  const target = await db.lexeme.upsert({
    where: {
      language_normalized_partOfSpeech: {
        language: "de",
        normalized,
        partOfSpeech,
      },
    },
    create: {
      lemma,
      normalized,
      partOfSpeech,
      article,
      plural,
      translations: {
        create: [
          { language: "en", text: englishMeaning },
          { language: "fa", text: persianMeaning },
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
        state: "NEW",
        nextReviewAt: new Date(),
      },
      update: {},
    }),
    db.lexemeRelation.upsert({
      where: {
        sourceId_targetId_type: {
          sourceId: source.id,
          targetId: target.id,
          type: relationType,
        },
      },
      create: {
        sourceId: source.id,
        targetId: target.id,
        type: relationType,
      },
      update: {},
    }),
  ]);

  revalidatePath(`/vocabulary/${source.id}`);
  revalidatePath("/vocabulary");
}

export async function scheduleTeachReviewAction(formData: FormData) {
  const lexemeId = String(formData.get("lexemeId") ?? "");
  const user = await getCurrentUser();

  const item = await db.userVocabulary.findUnique({
    where: {
      userId_lexemeId: { userId: user.id, lexemeId },
    },
  });

  if (!item) throw new Error("Vocabulary item not found.");

  await db.userVocabulary.update({
    where: { id: item.id },
    data: {
      nextReviewAt: new Date(),
      state: item.state === "NEW" ? "LEARNING" : item.state,
    },
  });

  revalidatePath(`/vocabulary/${lexemeId}/teach`);
  revalidatePath("/review");
}
