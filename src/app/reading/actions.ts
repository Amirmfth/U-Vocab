"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { generateReading } from "@/lib/ai/reading-generation";
import { recordGrammarEvidence } from "@/lib/grammar/learner-model";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { scoreReadingAssessment } from "@/lib/reading/assessment";
import { containsReadingTarget, READING_TARGETS_PER_LENGTH } from "@/lib/reading/targets";
import { consumeQuota } from "@/lib/entitlements/service";
import { entitlementErrorMessage } from "@/lib/entitlements/errors";
import { recordProductEvent } from "@/lib/product-events";
import { reportUnexpectedError } from "@/lib/observability/errors";
import { assertProviderSpendSafety } from "@/lib/entitlements/spend-safety";

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
  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!["SHORT", "MEDIUM", "LONG"].includes(length)) {
    return { status: "error", message: "Choose a valid reading length." };
  }

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const language = targetLanguageConfig(course.targetLanguage);
    const level = stretch ? course.targetLevel : course.currentLevel;

    const [selectedRows, candidateRows, grammarProgress, manualGrammar, recentGrammar] =
      await Promise.all([
        selectedIds.length
          ? db.lexeme.findMany({
              where: {
                id: { in: selectedIds },
                userStates: { some: { userCourseId: course.id } },
              },
              select: {
                id: true,
                lemma: true,
                patterns: { select: { pattern: true } },
              },
            })
          : Promise.resolve([]),
        db.userVocabulary.findMany({
          where: { userCourseId: course.id, lexemeId: { notIn: selectedIds } },
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
            userCourseId: course.id,
            status: { in: ["NEEDS_ATTENTION", "LEARNING"] },
          },
          include: { grammarConcept: true },
          orderBy: { lastEvidenceAt: "desc" },
          take: 6,
        }),
        grammarFocusId
          ? db.grammarConcept.findFirst({
              where: { id: grammarFocusId, active: true, language: language.code },
            })
          : Promise.resolve(null),
        db.storyGrammarTarget.findMany({
          where: { story: { userCourseId: course.id } },
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

    const minimumTargets = READING_TARGETS_PER_LENGTH[length];
    const seenLemmas = new Set<string>();
    const targetPool = [...selectedTargets, ...candidateTargets].filter((item) => {
      const lemma = item.lemma.toLocaleLowerCase(language.locale).trim();
      if (!lemma || seenLemmas.has(lemma)) return false;
      seenLemmas.add(lemma);
      return true;
    });
    if (targetPool.length < minimumTargets) {
      return {
        status: "error",
        message: `Add at least ${minimumTargets} distinct vocabulary words before generating a ${length.toLowerCase()} reading.`,
      };
    }

    await recordProductEvent("reading_started", {
      level,
      length,
      targetCount: minimumTargets,
    });

    await assertProviderSpendSafety({ userId: user.id, timeZone: user.timezone });

    await consumeQuota({
      userId: user.id,
      userCourseId: course.id,
      timeZone: user.timezone,
      key: "reading_generation_monthly",
      sourceRef: "reading:" + (requestId || crypto.randomUUID()),
      metadata: { length, stretch },
    });

    const selectedSet = new Set(selectedTargets.map((item) => item.lexemeId));
    const generationPool = targetPool.slice(0, Math.max(minimumTargets * 2, 20));
    let generated: Awaited<ReturnType<typeof generateReading>> | null = null;
    let usedTargets: typeof targetPool = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const draft = await generateReading({
        userId: user.id,
        userCourseId: course.id,
        targetLanguage: course.targetLanguage,
        level,
        length,
        topic,
        minimumTargets,
        selectedTargets: generationPool
          .filter((item) => selectedSet.has(item.lexemeId))
          .map((item) => ({ lemma: item.lemma, pattern: item.patterns[0]?.pattern ?? null })),
        candidateTargets: generationPool
          .filter((item) => !selectedSet.has(item.lexemeId))
          .map((item) => ({ lemma: item.lemma, pattern: item.patterns[0]?.pattern ?? null })),
        grammarConcepts: [...grammarById.values()],
      });
      const found = generationPool.filter((item) => containsReadingTarget(draft.content, item.lemma));
      if (found.length >= minimumTargets) {
        generated = draft;
        usedTargets = found;
        break;
      }
    }
    if (!generated) {
      return { status: "error", message: `The reading did not include ${minimumTargets} target words. Please try again.` };
    }

    const validCoverage = generated.grammarCoverage.filter(
      (coverage) =>
        grammarById.has(coverage.grammarConceptId) &&
        generated.content.includes(coverage.excerpt),
    );

    const story = await db.story.create({
      data: {
        userId: user.id,
        userCourseId: course.id,
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
          currentLevel: course.currentLevel,
          targetLevel: course.targetLevel,
          requestedGrammarIds: [...grammarById.keys()],
          requiredTargetCount: minimumTargets,
          usedTargetCount: usedTargets.length,
        },
        targets: {
          create: usedTargets.slice(0, 20).map((item, index) => ({
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

    await recordProductEvent("reading_completed", {
      level,
      length,
      comprehensionScore: null,
    });

    revalidateUserDomains(user.id, course.id, ["reading"]);
    revalidatePath("/reading");

    return {
      status: "success",
      message: "Reading generated.",
      readingId: story.id,
    };
  } catch (error) {
    reportUnexpectedError(error, { operation: "reading.generate" });
    return {
      status: "error",
      message:
        entitlementErrorMessage(error) ??
        (error instanceof Error ? error.message : "Could not generate reading."),
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
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const language = targetLanguageConfig(course.targetLanguage);
    const story = await db.story.findFirst({
      where: { id: readingId, userId: user.id, userCourseId: course.id },
      include: {
        targets: { select: { lexemeId: true } },
      },
    });
    if (!story) return { status: "error", message: "Reading not found." };

    const questions = story.questions as unknown as ReadingQuestion[];
    const answers = questions.map((_, index) =>
      Number(formData.get("answer-" + index)),
    );
    const answered = questions.filter((_, index) =>
      formData.has("answer-" + index),
    ).length;
    if (answered !== questions.length) {
      return { status: "error", message: "Answer every question first." };
    }

    const { correct, score, grammarEvidence } = scoreReadingAssessment(
      questions,
      answers,
    );

    await db.story.update({
      where: { id: story.id },
      data: {
        answers: questions.map((question, index) => ({
          question: question.question,
          selectedIndex: answers[index],
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
          userCourseId: course.id,
          lexemeId: target.lexemeId,
          source: "reading",
          sourceRef: story.id,
          context: story.content.slice(0, 1000),
        })),
        skipDuplicates: true,
      });
    }

    const grammarIds = [...new Set(
      grammarEvidence.map((item) => item.grammarConceptId),
    )];
    const validGrammar = grammarIds.length
      ? await db.grammarConcept.findMany({
          where: {
            id: { in: grammarIds },
            active: true,
            language: language.code,
          },
          select: { id: true },
        })
      : [];
    const validGrammarIds = new Set(validGrammar.map((item) => item.id));

    for (const evidence of grammarEvidence) {
      if (!validGrammarIds.has(evidence.grammarConceptId)) continue;
      await recordGrammarEvidence({
        userId: user.id,
        userCourseId: course.id,
        grammarConceptId: evidence.grammarConceptId,
        source: "READING_COMPREHENSION",
        outcome: evidence.correct ? "SUCCESS" : "ERROR",
        dimension: "UNDERSTANDING",
        strength: 0.55,
        confidence: 0.9,
        dedupeKey:
          "reading:" + story.id + ":question:" + evidence.questionIndex,
        sourceRef: story.id,
        excerpt: questions[evidence.questionIndex]?.question,
        metadata: { questionType: "GRAMMAR" },
      });
    }

    revalidateUserDomains(
      user.id,
      course.id,
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
