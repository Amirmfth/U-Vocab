"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateReading } from "@/lib/ai/reading-generation";
import { recordGrammarEvidence } from "@/lib/grammar/learner-model";
import { revalidateUserDomains } from "@/lib/cache-tags";

const TARGETS_PER_LENGTH = { SHORT: 3, MEDIUM: 5, LONG: 7 } as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

function containsLemma(content: string, lemma: string) {
  return new RegExp(
    "(?<![\\p{L}\\p{N}_])" + escapeRegex(lemma) + "(?![\\p{L}\\p{N}_])",
    "iu",
  ).test(content);
}

export type ReadingCreateState = {
  status: "idle" | "success" | "error";
  message?: string;
  readingId?: string;
};

export async function createGeneratedReading(
  _previous: ReadingCreateState,
  formData: FormData,
): Promise<ReadingCreateState> {
  const length = String(formData.get("length") ?? "MEDIUM") as
    | "SHORT"
    | "MEDIUM"
    | "LONG";
  const topic = String(formData.get("topic") ?? "").trim() || null;
  const stretch = String(formData.get("stretch") ?? "") === "on";
  const selectedIds = formData.getAll("targetIds").map(String);
  const grammarFocusId = String(formData.get("grammarFocusId") ?? "").trim();

  if (!["SHORT", "MEDIUM", "LONG"].includes(length)) {
    return { status: "error", message: "Choose a valid reading length." };
  }

  try {
    const user = await getCurrentUser();
    const level = stretch ? user.targetLevel : user.currentLevel;

    const [selectedRows, candidateRows, grammarProgress, manualGrammar, recentGrammar] =
      await Promise.all([
        selectedIds.length
          ? db.lexeme.findMany({
              where: {
                id: { in: selectedIds },
                userStates: { some: { userId: user.id } },
              },
              select: {
                id: true,
                lemma: true,
                patterns: { select: { pattern: true } },
              },
            })
          : Promise.resolve([]),
        db.userVocabulary.findMany({
          where: { userId: user.id, lexemeId: { notIn: selectedIds } },
          select: {
            lexemeId: true,
            lexeme: {
              select: {
                lemma: true,
                patterns: { select: { pattern: true } },
              },
            },
          },
          orderBy: [
            { production: "asc" },
            { contextualUsage: "asc" },
            { meaningRecall: "asc" },
          ],
          take: 60,
        }),
        db.userGrammarProgress.findMany({
          where: {
            userId: user.id,
            status: { in: ["NEEDS_ATTENTION", "LEARNING"] },
          },
          include: { grammarConcept: true },
          orderBy: { lastEvidenceAt: "desc" },
          take: 6,
        }),
        grammarFocusId
          ? db.grammarConcept.findFirst({
              where: { id: grammarFocusId, active: true, language: "de" },
            })
          : Promise.resolve(null),
        db.storyGrammarTarget.findMany({
          where: { story: { userId: user.id } },
          select: { grammarConceptId: true },
          orderBy: { story: { createdAt: "desc" } },
          take: 12,
        }),
      ]);

    const recentCounts = new Map<string, number>();
    for (const item of recentGrammar) {
      recentCounts.set(
        item.grammarConceptId,
        (recentCounts.get(item.grammarConceptId) ?? 0) + 1,
      );
    }

    const grammarById = new Map<string, {
      id: string;
      title: string;
      shortDescription: string;
      status: string;
    }>();

    if (manualGrammar) {
      grammarById.set(manualGrammar.id, {
        id: manualGrammar.id,
        title: manualGrammar.title,
        shortDescription: manualGrammar.shortDescription,
        status: "MANUAL",
      });
    }
    for (const progress of grammarProgress) {
      if ((recentCounts.get(progress.grammarConceptId) ?? 0) >= 2 && !grammarFocusId) {
        continue;
      }
      grammarById.set(progress.grammarConceptId, {
        id: progress.grammarConceptId,
        title: progress.grammarConcept.title,
        shortDescription: progress.grammarConcept.shortDescription,
        status: progress.status,
      });
      if (grammarById.size >= 3) break;
    }

    const selectedTargets = selectedRows.map((item) => ({
      lexemeId: item.id,
      lemma: item.lemma,
      patterns: item.patterns,
    }));
    const candidateTargets = candidateRows.map((item) => ({
      lexemeId: item.lexemeId,
      lemma: item.lexeme.lemma,
      patterns: item.lexeme.patterns,
    }));

    const generated = await generateReading({
      userId: user.id,
      level,
      length,
      topic,
      selectedTargets: selectedTargets.map((item) => ({
        lemma: item.lemma,
        pattern: item.patterns[0]?.pattern ?? null,
      })),
      candidateTargets: candidateTargets
        .slice(0, Math.max(12, TARGETS_PER_LENGTH[length] * 3))
        .map((item) => ({
          lemma: item.lemma,
          pattern: item.patterns[0]?.pattern ?? null,
        })),
      grammarConcepts: [...grammarById.values()],
    });

    const targetPool = [...selectedTargets, ...candidateTargets];
    const usedLemmaSet = new Set(
      generated.usedTargets.map((lemma) =>
        lemma.toLocaleLowerCase("de-DE").trim(),
      ),
    );
    const usedTargets = targetPool.filter((item) => {
      const normalized = item.lemma.toLocaleLowerCase("de-DE").trim();
      return usedLemmaSet.has(normalized) && containsLemma(generated.content, item.lemma);
    });

    const validCoverage = generated.grammarCoverage.filter(
      (coverage) =>
        grammarById.has(coverage.grammarConceptId) &&
        generated.content.includes(coverage.excerpt),
    );

    const story = await db.story.create({
      data: {
        userId: user.id,
        title: generated.title,
        topic,
        level,
        length,
        content: generated.content,
        englishSummary: generated.englishSummary,
        persianSummary: generated.persianSummary,
        questions: generated.questions,
        generationMeta: {
          product: "READING",
          stretch,
          currentLevel: user.currentLevel,
          targetLevel: user.targetLevel,
          requestedGrammarIds: [...grammarById.keys()],
          usedTargetCount: usedTargets.length,
        },
        targets: {
          create: usedTargets.slice(0, TARGETS_PER_LENGTH[length] + 3).map((item, index) => ({
            lexemeId: item.lexemeId,
            position: index,
          })),
        },
        grammarTargets: {
          create: validCoverage.map((coverage, index) => ({
            grammarConceptId: coverage.grammarConceptId,
            excerpt: coverage.excerpt,
            explanation: coverage.explanation,
            intentional: coverage.intentional,
            position: index,
          })),
        },
      },
    });

    revalidateUserDomains(user.id, ["reading"]);
    revalidatePath("/reading");

    return {
      status: "success",
      message: "Reading generated.",
      readingId: story.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not generate reading.",
    };
  }
}

type ReadingQuestion = {
  type: "COMPREHENSION" | "VOCABULARY" | "GRAMMAR";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  grammarConceptId: string | null;
};

export type ReadingAnswerState = {
  status: "idle" | "success" | "error";
  message?: string;
  score?: number;
  correct?: boolean[];
};

export async function submitReadingAnswers(
  _previous: ReadingAnswerState,
  formData: FormData,
): Promise<ReadingAnswerState> {
  const readingId = String(formData.get("readingId") ?? "");

  try {
    const user = await getCurrentUser();
    const story = await db.story.findFirst({
      where: { id: readingId, userId: user.id },
      include: {
        targets: { select: { lexemeId: true } },
      },
    });
    if (!story) return { status: "error", message: "Reading not found." };

    const questions = story.questions as unknown as ReadingQuestion[];
    const correct = questions.map((question, index) => {
      const answer = Number(formData.get("answer-" + index));
      return Number.isInteger(answer) && answer === question.correctIndex;
    });
    const answered = questions.filter((_, index) =>
      formData.has("answer-" + index),
    ).length;
    if (answered !== questions.length) {
      return { status: "error", message: "Answer every question first." };
    }

    const score =
      questions.length > 0
        ? correct.filter(Boolean).length / questions.length
        : 0;

    await db.story.update({
      where: { id: story.id },
      data: {
        answers: questions.map((question, index) => ({
          question: question.question,
          selectedIndex: Number(formData.get("answer-" + index)),
          correct: correct[index],
        })),
        comprehensionScore: score,
        completedAt: new Date(),
      },
    });

    if (story.targets.length) {
      await db.encounter.createMany({
        data: story.targets.map((target) => ({
          userId: user.id,
          lexemeId: target.lexemeId,
          source: "reading",
          sourceRef: story.id,
          context: story.content.slice(0, 1000),
        })),
        skipDuplicates: true,
      });
    }

    for (const [index, question] of questions.entries()) {
      if (question.type !== "GRAMMAR" || !question.grammarConceptId) continue;
      const concept = await db.grammarConcept.findFirst({
        where: {
          id: question.grammarConceptId,
          active: true,
          language: "de",
        },
        select: { id: true },
      });
      if (!concept) continue;

      await recordGrammarEvidence({
        userId: user.id,
        grammarConceptId: concept.id,
        source: "READING_COMPREHENSION",
        outcome: correct[index] ? "SUCCESS" : "ERROR",
        dimension: "UNDERSTANDING",
        strength: 0.55,
        confidence: 0.9,
        dedupeKey: "reading:" + story.id + ":question:" + index,
        sourceRef: story.id,
        excerpt: question.question,
        metadata: { questionType: "GRAMMAR" },
      });
    }

    revalidateUserDomains(
      user.id,
      ["reading", "vocabulary", "progress"],
      story.targets.map((target) => target.lexemeId),
    );
    revalidatePath("/reading/" + story.id);

    return {
      status: "success",
      message: "Reading completed.",
      score,
      correct,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not score reading.",
    };
  }
}
