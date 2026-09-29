"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { generateLexicalExamples } from "@/lib/ai/lexical-examples";
import { generateQuickTeach } from "@/lib/ai/quick-teach";
import { revalidateUserDomains } from "@/lib/cache-tags";

export type InsightActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function generateQuickTeachAction(lexemeId: string, displayLanguage?: "en" | "fa") {
  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const lexeme = await db.lexeme.findFirst({
      where: { id: lexemeId, userStates: { some: { userCourseId: course.id } } },
      select: {
        lemma: true,
        article: true,
        partOfSpeech: true,
        translations: { select: { language: true, text: true } },
        patterns: { select: { pattern: true }, take: 2 },
      },
    });
    if (!lexeme) return { status: "error" as const, message: "This word is not in your vocabulary." };

    const language = (displayLanguage ?? (course.explanationLanguage === "PERSIAN" ? "fa" : "en")) === "fa"
      ? "Persian"
      : "English";
    const meaning = lexeme.translations.find((item) => item.language === (language === "Persian" ? "fa" : "en"))?.text
      ?? lexeme.translations[0]?.text
      ?? "";
    const lesson = await generateQuickTeach({
      userId: user.id,
      lemma: lexeme.lemma,
      article: lexeme.article,
      partOfSpeech: lexeme.partOfSpeech,
      level: course.targetLevel,
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
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const lexeme = await db.lexeme.findFirst({
      where: { id: lexemeId, userStates: { some: { userCourseId: course.id } } },
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
      level: course.targetLevel,
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
            level: course.targetLevel,
            generatedByAi: true,
          })),
        });
      });
      revalidateUserDomains(user.id, course.id, ["vocabulary"], [lexeme.id]);
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

export async function generateInsightAction(
  _previous: InsightActionState,
  _formData: FormData,
): Promise<InsightActionState> {
  return { status: "error", message: "Contextual explanations are disabled." };
}

export async function generateExpansionAction(
  _previous: InsightActionState,
  _formData: FormData,
): Promise<InsightActionState> {
  return { status: "error", message: "Word expansion is disabled." };
}

export async function addExpansionAction(
  _previous: InsightActionState,
  _formData: FormData,
): Promise<InsightActionState> {
  return { status: "error", message: "Word expansion is disabled." };
}

export async function scheduleTeachReviewAction(
  _previous: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const item = await db.userVocabulary.findUnique({
      where: {
        userCourseId_lexemeId: { userCourseId: course.id, lexemeId },
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
