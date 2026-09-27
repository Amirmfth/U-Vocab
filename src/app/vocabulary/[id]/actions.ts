"use server";

import type { PartOfSpeech, RelationType, VocabularyState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateLexicalInsight } from "@/lib/ai/lexical-insight";
import { generateLexicalExamples } from "@/lib/ai/lexical-examples";
import { generateQuickTeach } from "@/lib/ai/quick-teach";
import { generateWordExpansion } from "@/lib/ai/expand-word";
import { revalidateUserDomains } from "@/lib/cache-tags";

export type InsightActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function generateQuickTeachAction(lexemeId: string) {
  try {
    const user = await getCurrentUser();
    const lexeme = await db.lexeme.findFirst({
      where: { id: lexemeId, userStates: { some: { userId: user.id } } },
      select: {
        lemma: true,
        article: true,
        partOfSpeech: true,
        translations: { select: { language: true, text: true } },
        patterns: { select: { pattern: true }, take: 2 },
      },
    });
    if (!lexeme) return { status: "error" as const, message: "This word is not in your vocabulary." };

    const language = user.preferredTranslation === "PERSIAN" ? "Persian" : "English";
    const meaning = lexeme.translations.find((item) => item.language === (language === "Persian" ? "fa" : "en"))?.text
      ?? lexeme.translations[0]?.text
      ?? "";
    const lesson = await generateQuickTeach({
      userId: user.id,
      lemma: lexeme.lemma,
      article: lexeme.article,
      partOfSpeech: lexeme.partOfSpeech,
      level: user.targetLevel,
      meaning: meaning.slice(0, 120),
      language,
      patterns: lexeme.patterns.map((item) => item.pattern.slice(0, 80)),
    });
    return { status: "success" as const, lesson };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not generate a lesson.",
    };
  }
}

export async function generateExamplesAction(
  _previous: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");

  try {
    const user = await getCurrentUser();
    const lexeme = await db.lexeme.findFirst({
      where: { id: lexemeId, userStates: { some: { userId: user.id } } },
      include: {
        patterns: { select: { pattern: true } },
        examples: { select: { german: true } },
      },
    });
    if (!lexeme) {
      return { status: "error", message: "This word is not in your vocabulary." };
    }

    const generated = await generateLexicalExamples({
      userId: user.id,
      lemma: lexeme.lemma,
      article: lexeme.article,
      partOfSpeech: lexeme.partOfSpeech,
      level: user.targetLevel,
      patterns: lexeme.patterns.map((pattern) => pattern.pattern),
      existingExamples: lexeme.examples.slice(0, 8).map((example) => example.german),
    });
    const seen = new Set<string>();
    const unique = generated.filter((example) => {
      const normalized = example.german.toLocaleLowerCase("de-DE").trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    if (unique.length) {
      await db.$transaction(async (tx) => {
        await tx.example.deleteMany({ where: { lexemeId: lexeme.id } });
        await tx.example.createMany({
          data: unique.slice(0, 4).map((example) => ({
            lexemeId: lexeme.id,
            german: example.german,
            english: example.english,
            persian: example.persian,
            register: example.register,
            level: user.targetLevel,
            generatedByAi: true,
          })),
        });
      });
      revalidateUserDomains(user.id, ["vocabulary"], [lexeme.id]);
      revalidatePath(`/vocabulary/${lexeme.id}`);
      revalidatePath(`/vocabulary/${lexeme.id}/teach`);
    }

    return {
      status: "success",
      message: unique.length
        ? `${Math.min(unique.length, 4)} example${unique.length === 1 ? "" : "s"} replaced the previous examples.`
        : "No new examples were generated. Try again for different contexts.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not generate examples.",
    };
  }
}

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
    });

    await db.lexemeInsight.upsert({
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
        },
        update: {
          germanDefinition: result.germanDefinition,
          englishExplanation: result.englishExplanation,
          persianExplanation: result.persianExplanation,
          grammarNotes: result.grammarNotes,
          comparisonTarget: null,
          comparisonNotes: null,
          version: { increment: 1 },
        },
    });

    revalidateUserDomains(user.id, ["vocabulary"], [lexeme.id]);
    revalidatePath(`/vocabulary/${lexeme.id}`);
    revalidatePath(`/vocabulary/${lexeme.id}/teach`);

    return {
      status: "success",
      message: "Contextual explanation regenerated.",
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

    const refresh = String(formData.get("refresh") ?? "") === "true";
    const result = await generateWordExpansion({
      refresh,
      userId: user.id,
      lemma: lexeme.lemma,
      partOfSpeech: lexeme.partOfSpeech,
      patterns: lexeme.patterns.map((pattern) => pattern.pattern),
      level: user.targetLevel,
    });

    const uniqueSuggestions = Array.from(
      new Map(
        result.suggestions
          .filter(
            (suggestion) =>
              suggestion.lemma.toLocaleLowerCase("de-DE").trim() !== lexeme.normalized,
          )
          .map((suggestion) => [
            suggestion.lemma.toLocaleLowerCase("de-DE").trim() + ":" + suggestion.partOfSpeech,
            suggestion,
          ]),
      ).values(),
    ).sort((a, b) => b.usefulness - a.usefulness);

    const suggestions = await Promise.all(
      uniqueSuggestions.map(async (suggestion) => {
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

export type AddExpansionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addExpansionAction(
  _previous: AddExpansionState,
  formData: FormData,
): Promise<AddExpansionState> {
  const sourceId = String(formData.get("sourceId") ?? "");
  const lemma = String(formData.get("lemma") ?? "").trim();
  const partOfSpeech = String(formData.get("partOfSpeech") ?? "") as PartOfSpeech;
  const article = String(formData.get("article") ?? "").trim() || null;
  const plural = String(formData.get("plural") ?? "").trim() || null;
  const englishMeaning = String(formData.get("englishMeaning") ?? "").trim();
  const persianMeaning = String(formData.get("persianMeaning") ?? "").trim();
  const relationType = String(formData.get("relationType") ?? "") as RelationType;

  try {
    const user = await getCurrentUser();
    const source = await db.lexeme.findFirst({
      where: {
        id: sourceId,
        userStates: { some: { userId: user.id } },
      },
    });
    if (!source) {
      return { status: "error", message: "Source vocabulary item not found." };
    }

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
        cefrLevel: user.targetLevel,
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

    revalidateUserDomains(
      user.id,
      ["home", "vocabulary", "review", "progress"],
      [source.id, target.id],
    );
    revalidatePath(`/vocabulary/${source.id}`);
    revalidatePath("/vocabulary");

    return { status: "success", message: "Added to vocabulary and linked in the lexical graph." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add this lexical unit.",
    };
  }
}

export async function scheduleTeachReviewAction(
  _previous: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");

  try {
    const user = await getCurrentUser();
    const item = await db.userVocabulary.findUnique({
      where: {
        userId_lexemeId: { userId: user.id, lexemeId },
      },
    });

    if (!item) {
      return { status: "error", message: "Vocabulary item not found." };
    }

    await db.userVocabulary.update({
      where: { id: item.id },
      data: {
        nextReviewAt: new Date(),
        state: item.state === "NEW" ? "LEARNING" : item.state,
      },
    });

    revalidateUserDomains(
      user.id,
      ["home", "vocabulary", "review", "progress"],
      [lexemeId],
    );
    revalidatePath(`/vocabulary/${lexemeId}/teach`);
    revalidatePath("/review");

    return { status: "success", message: "Added to the review queue." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not schedule this review.",
    };
  }
}
