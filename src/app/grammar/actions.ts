"use server";

import { GrammarProgressSource, GrammarProgressStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { db } from "@/lib/db";
import { generateGrammarQuickTeach } from "@/lib/ai/grammar-quick-teach";
import { recordProductEvent } from "@/lib/product-events";
import { reportUnexpectedError } from "@/lib/observability/errors";
import { targetLanguageConfig } from "@/lib/languages";

export async function startGrammarConceptAction(formData: FormData) {
  const grammarConceptId = String(formData.get("grammarConceptId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!grammarConceptId || !slug) return;

  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const language = targetLanguageConfig(course.targetLanguage);
  const concept = await db.grammarConcept.findFirst({
    where: { id: grammarConceptId, slug, active: true, language: language.code },
    select: { id: true, introducedAt: true },
  });
  if (!concept) return;

  const existing = await db.userGrammarProgress.findUnique({
    where: {
      userCourseId_grammarConceptId: {
        userCourseId: course.id,
        grammarConceptId,
      },
    },
  });

  if (existing?.status === GrammarProgressStatus.STRONG) return;

  await db.userGrammarProgress.upsert({
    where: {
      userCourseId_grammarConceptId: {
        userCourseId: course.id,
        grammarConceptId,
      },
    },
    create: {
      userId: user.id,
      userCourseId: course.id,
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

  await recordProductEvent("grammar_practice_started", {
    grammarConceptId: concept.id,
    exerciseType: "concept_learning",
  });

  revalidatePath("/grammar");
  revalidatePath("/grammar/" + slug);
}


function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

export async function generateGrammarQuickTeachAction(
  grammarConceptId: string,
  previousAngle?: string | null,
) {
  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const target = targetLanguageConfig(course.targetLanguage);
    const concept = await db.grammarConcept.findFirst({
      where: { id: grammarConceptId, active: true, language: target.code },
      include: {
        lessons: { select: { language: true, overview: true, intuition: true } },
        mistakes: {
          where: { userId: user.id, userCourseId: course.id, resolvedAt: null },
          orderBy: { lastOccurredAt: "desc" },
          take: 5,
        },
        lexemeLinks: {
          where: {
            confidence: { gte: 0.65 },
            lexeme: { userStates: { some: { userCourseId: course.id } } },
          },
          include: {
            lexeme: {
              select: {
                lemma: true,
                article: true,
              },
            },
            lexicalPattern: { select: { pattern: true } },
          },
          orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
          take: 10,
        },
      },
    });

    if (!concept) {
      return { status: "error" as const, message: "Grammar concept not found." };
    }

    const personalVocabulary = concept.lexemeLinks.map((link) => {
      const label = link.lexeme.article
        ? link.lexeme.article + " " + link.lexeme.lemma
        : link.lexeme.lemma;
      return link.lexicalPattern?.pattern
        ? label + " — " + link.lexicalPattern.pattern
        : label;
    });

    const recentMistakes = concept.mistakes.map((mistake) =>
      [
        mistake.actual ? "Learner used: " + mistake.actual : null,
        mistake.expected ? "Expected: " + mistake.expected : null,
        mistake.explanation ?? null,
      ]
        .filter(Boolean)
        .join(" | "),
    );

    const language =
      course.explanationLanguage === "PERSIAN" ? "Persian" : "English";
    const preferredLesson = concept.lessons.find((item) => item.language === (language === "Persian" ? "fa" : "en"))
      ?? concept.lessons.find((item) => item.language === "en");
    const lesson = await generateGrammarQuickTeach({
      userId: user.id,
      userCourseId: course.id,
      targetLanguage: course.targetLanguage,
      title: concept.title,
      level: course.currentLevel,
      targetLevel: course.targetLevel,
      language,
      canonicalSummary:
        concept.shortDescription +
        (concept.explanation ? "\n" + concept.explanation : ""),
      mainLessonSummary: preferredLesson
        ? preferredLesson.overview + "\n" + preferredLesson.intuition
        : concept.explanation ?? concept.shortDescription,
      rules: stringArray(concept.rules),
      recentMistakes,
      personalVocabulary,
      previousAngle,
    });

    const angleLine = lesson.split("\n", 1)[0] ?? "";
    const angle = angleLine.startsWith("Angle:")
      ? angleLine.slice("Angle:".length).trim()
      : null;
    const body = angle
      ? lesson.slice(angleLine.length).trimStart()
      : lesson;

    return {
      status: "success" as const,
      lesson: body,
      angle,
    };
  } catch (error) {
    reportUnexpectedError(error, { operation: "grammar.quick_teach" });
    return {
      status: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Could not generate another grammar explanation.",
    };
  }
}
