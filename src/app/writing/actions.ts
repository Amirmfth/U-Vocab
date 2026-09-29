"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { generateWritingTask } from "@/lib/ai/writing-task";
import { evaluateWriting } from "@/lib/ai/writing-evaluator";
import { writingEvaluationSchema } from "@/lib/ai/writing-evaluator";
import { recordMistakesBatch } from "@/lib/mistakes-batch";
import {
  updateVocabularyMasteryBatch,
  type VocabularyMasteryUpdate,
} from "@/lib/vocabulary-batch";
import { instrumentOperation } from "@/lib/performance";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { detectLexemePresence, detectRepeatedWords } from "@/lib/ai/preprocess";
import { evaluationLocaleForPreference } from "@/lib/evaluation-locale";
import { CEFR_RANK } from "@/lib/grammar/levels";
import { recordGrammarEvidence } from "@/lib/grammar/learner-model";
import {
  recordGrammarMistake,
  resolveGrammarMistakes,
} from "@/lib/grammar/mistakes";
import {
  acceptedWritingGrammarObservations,
  grammarMistakeTypeForCategory,
  parentErrorConceptIds,
  writingEvidenceOutcome,
  writingObservationStrength,
} from "@/lib/grammar/writing-evidence";

export type WritingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  sessionId?: string;
};

async function selectGuidedTargets(input: {
  userId: string;
  userCourseId: string;
  limit: number;
}) {
  const weak = await db.userVocabulary.findMany({
    where: { userCourseId: input.userCourseId },
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
    take: input.limit,
  });

  return weak.map((item) => ({
    id: item.lexemeId,
    lemma: item.lexeme.lemma,
    patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
  }));
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export async function createWritingSessionAction(
  _previous: WritingActionState,
  formData: FormData,
): Promise<WritingActionState> {
  const mode =
    String(formData.get("mode") ?? "GUIDED") === "OPEN" ? "OPEN" : "GUIDED";
  const level = String(formData.get("level") ?? "B2");
  const taskType = String(formData.get("taskType") ?? "essay");
  const topic =
    String(formData.get("topic") ?? "").trim() || "Alltag und Gesellschaft";
  const targetWordsRaw = String(formData.get("targetWords") ?? "120");
  const requestedWords =
    targetWordsRaw === "CUSTOM"
      ? Number(formData.get("customWords") ?? 150)
      : Number(targetWordsRaw);
  const targetWords = Math.max(
    60,
    Math.min(500, Number.isFinite(requestedWords) ? requestedWords : 120),
  );

  return instrumentOperation(
    "writing.create",
    {
      mode,
      level,
      taskType,
      targetWords,
    },
    async (perf) => {
      try {
        const [user, course] = await Promise.all([
          perf.span("auth", () => getCurrentUser()),
          perf.span("course", () => getCurrentCourse()),
        ]);
        const targets =
          mode === "GUIDED"
            ? await perf.span("dbRead", () =>
                selectGuidedTargets({
                  userId: user.id,
                  userCourseId: course.id,
                  limit: 6,
                }),
              )
            : [];

        if (mode === "GUIDED" && targets.length < 2) {
          return {
            status: "error",
            message: "Add more vocabulary before using Guided vocabulary mode.",
          };
        }

        const generated = await perf.span("ai", () =>
          generateWritingTask({
            userId: user.id,
            userCourseId: course.id,
            mode,
            level,
            taskType,
            topic,
            targetWords,
            targets: targets.map((target) => ({
              lemma: target.lemma,
              patterns: target.patterns,
            })),
          }),
        );

        const task = [
          generated.title,
          generated.task,
          "",
          "Checklist:",
          ...generated.checklist.map((item) => "- " + item),
        ].join("\n");

        const session = await perf.span("dbWrite", () =>
          db.writingSession.create({
            data: {
              userId: user.id,
              userCourseId: course.id,
              mode,
              level,
              taskType,
              topic,
              targetWords,
              task,
              targets: {
                create: targets.map((target, position) => ({
                  lexemeId: target.id,
                  position,
                })),
              },
            },
          }),
        );

        revalidateUserDomains(user.id, course.id, ["writing"]);

        return {
          status: "success",
          message: "Writing task ready.",
          sessionId: session.id,
        };
      } catch (error) {
        perf.fail(error);
        return {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not create writing task.",
        };
      }
    },
  );
}

async function detectKnownLexemes(userCourseId: string, draft: string) {
  const vocabulary = await db.userVocabulary.findMany({
    where: { userCourseId },
    select: {
      lexemeId: true,
      lexeme: { select: { lemma: true } },
    },
    orderBy: { addedAt: "desc" },
    take: 300,
  });

  const present = new Set(
    detectLexemePresence(
      draft,
      vocabulary.map((item) => item.lexeme.lemma),
    ),
  );
  const selected = vocabulary
    .filter((item) => present.has(item.lexeme.lemma))
    .slice(0, 12);

  if (!selected.length) return [];

  return db.userVocabulary
    .findMany({
      where: {
        userCourseId,
        lexemeId: { in: selected.map((item) => item.lexemeId) },
      },
      select: {
        lexemeId: true,
        lexeme: {
          select: {
            lemma: true,
            patterns: { select: { pattern: true } },
          },
        },
      },
    })
    .then((items) =>
      items.map((item) => ({
        id: item.lexemeId,
        lemma: item.lexeme.lemma,
        patterns: item.lexeme.patterns
          .map((pattern) => pattern.pattern)
          .slice(0, 3),
      })),
    );
}

export async function evaluateWritingAction(
  _previous: WritingActionState,
  formData: FormData,
): Promise<WritingActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const draft = String(formData.get("draft") ?? "").trim();

  return instrumentOperation(
    "writing.evaluate",
    {
      draftChars: draft.length,
      draftWords: countWords(draft),
      hasSessionId: Boolean(sessionId),
    },
    async (perf) => {
      if (draft.length < 40) {
        return {
          status: "error",
          message: "Write a little more before evaluation.",
        };
      }

      try {
        const [user, course] = await Promise.all([
          perf.span("auth", () => getCurrentUser()),
          perf.span("course", () => getCurrentCourse()),
        ]);
        const session = await perf.span("dbRead", () =>
          db.writingSession.findFirst({
            where: { id: sessionId, userId: user.id, userCourseId: course.id },
            select: {
              id: true,
              parentId: true,
              level: true,
              mode: true,
              taskType: true,
              task: true,
              targetWords: true,
              targets: {
                select: {
                  lexemeId: true,
                  lexeme: {
                    select: {
                      lemma: true,
                      patterns: { select: { pattern: true } },
                    },
                  },
                },
                orderBy: { position: "asc" },
              },
            },
          }),
        );
        if (!session) {
          return { status: "error", message: "Writing session not found." };
        }

        const observed = await perf.span("dbRead", () =>
          detectKnownLexemes(course.id, draft),
        );
        const requiredTargets = session.targets.map((target) => ({
          id: target.lexemeId,
          lemma: target.lexeme.lemma,
          patterns: target.lexeme.patterns.map((pattern) => pattern.pattern),
        }));
        const requiredIds = new Set(requiredTargets.map((target) => target.id));
        const observedVocabulary = observed.filter((item) => !requiredIds.has(item.id));
        const repetitions = detectRepeatedWords(draft);
        const parentId = session.parentId;
        const parent = parentId
          ? await perf.span("dbRead", () =>
              db.writingSession.findFirst({
                where: { id: parentId, userId: user.id, userCourseId: course.id },
                select: { draft: true, wordCount: true, evaluation: true },
              }),
            )
          : null;
        const parentEvaluation = parent?.evaluation
          ? writingEvaluationSchema.safeParse(parent.evaluation)
          : null;

        const grammarConceptRows = await perf.span("dbRead", () =>
          db.grammarConcept.findMany({
            where: {
              active: true,
              language: targetLanguageConfig(course.targetLanguage).code,
              introducedAt: {
                in: (Object.keys(CEFR_RANK) as Array<keyof typeof CEFR_RANK>)
                  .filter((level) => CEFR_RANK[level] <= CEFR_RANK[course.targetLevel]),
              },
            },
            include: {
              userProgress: {
                where: { userCourseId: course.id },
                take: 1,
              },
            },
            orderBy: { order: "asc" },
          }),
        );

        const grammarConcepts = grammarConceptRows
          .map((concept) => ({
            id: concept.id,
            title: concept.title,
            shortDescription: concept.shortDescription,
            introducedAt: concept.introducedAt,
            status: concept.userProgress[0]?.status ?? "UNASSESSED",
            category: concept.category,
          }))
          .sort((a, b) => {
            const priority = {
              NEEDS_ATTENTION: 0,
              LEARNING: 1,
              ASSUMED: 2,
              UNASSESSED: 3,
              STRONG: 4,
            } as const;
            return priority[a.status] - priority[b.status];
          })
          .slice(0, 36);

        const evaluation = await perf.span("ai", () =>
          evaluateWriting({
            userId: user.id,
            userCourseId: course.id,
            evaluationLocale: evaluationLocaleForPreference(course.explanationLanguage),
            level: session.level,
            mode: session.mode,
            taskType: session.taskType,
            task: session.task,
            targetWords: session.targetWords,
            draft,
            precomputedWordCount: countWords(draft),
            repeatedWords: repetitions,
            requiredTargets: requiredTargets.map((item) => ({
              lexemeId: item.id,
              lemma: item.lemma,
              patterns: item.patterns,
            })),
            observedVocabulary: observedVocabulary.slice(0, 12).map((item) => ({
              lemma: item.lemma,
              patterns: item.patterns,
            })),
            grammarConcepts: grammarConcepts.map((concept) => ({
              id: concept.id,
              title: concept.title,
              shortDescription: concept.shortDescription,
              introducedAt: concept.introducedAt,
              status: concept.status,
            })),
            rewriteContext: parent
              ? {
                  previousDraft: parent.draft,
                  previousWordCount: parent.wordCount,
                  previousEvaluation: parentEvaluation?.success
                    ? {
                        overall: parentEvaluation.data.overall,
                        summary: parentEvaluation.data.summary,
                        improvements: parentEvaluation.data.improvements,
                        corrections: parentEvaluation.data.corrections,
                        grammarObservations: parentEvaluation.data.grammarObservations,
                      }
                    : undefined,
                }
              : undefined,
          }),
        );

        const validIds = requiredIds;
        const grammarConceptById = new Map(
          grammarConcepts.map((concept) => [concept.id, concept]),
        );
        const acceptedGrammar = acceptedWritingGrammarObservations(
          evaluation.grammarObservations,
          new Set(grammarConceptById.keys()),
        );
        const parentErrors = parentErrorConceptIds(
          parentEvaluation?.success ? parentEvaluation.data : null,
        );
        const usageById = new Map(
          evaluation.targetUsage
            .filter((item) => validIds.has(item.lexemeId))
            .map((item) => [item.lexemeId, item]),
        );

        const usedLexemeIds = requiredTargets
          .filter((item) => usageById.get(item.id)?.used)
          .map((item) => item.id);

        const vocabularyRows = usedLexemeIds.length
          ? await perf.span("dbRead", () =>
              db.userVocabulary.findMany({
                where: {
                  userCourseId: course.id,
                  lexemeId: { in: usedLexemeIds },
                },
                select: {
                  id: true,
                  lexemeId: true,
                  production: true,
                  contextualUsage: true,
                },
              }),
            )
          : [];

        const vocabularyByLexeme = new Map(
          vocabularyRows.map((item) => [item.lexemeId, item]),
        );

        const attempts: Prisma.AttemptCreateManyInput[] = [];
        const masteryUpdates: VocabularyMasteryUpdate[] = [];

        for (const item of requiredTargets) {
          const usage = usageById.get(item.id);
          if (!usage?.used) continue;

          const userVocabulary = vocabularyByLexeme.get(item.id);
          attempts.push({
            userId: user.id,
            userCourseId: course.id,
            userVocabularyId: userVocabulary?.id ?? null,
            exerciseType: "FREE_SENTENCE" as const,
            prompt: "Use vocabulary naturally in a German writing task.",
            answer: draft,
            expected: item.lemma,
            correct: usage.correct,
            score: usage.naturalness,
            feedback: usage.note,
          });

          if (userVocabulary) {
            masteryUpdates.push({
              id: userVocabulary.id,
              production: Math.max(
                0,
                Math.min(
                  1,
                  userVocabulary.production + (usage.correct ? 0.08 : -0.02),
                ),
              ),
              contextualUsage: Math.max(
                0,
                Math.min(
                  1,
                  userVocabulary.contextualUsage +
                    (usage.correct ? 0.08 : -0.015),
                ),
              ),
            });
          }
        }

        await perf.span("dbWrite", () =>
          db.$transaction(async (tx) => {
            await tx.writingSession.update({
              where: { id: session.id },
              data: {
                status: "EVALUATED",
                draft,
                wordCount: countWords(draft),
                evaluation,
                evaluatedAt: new Date(),
              },
            });

            if (attempts.length) {
              await tx.attempt.createMany({ data: attempts });
            }

            await updateVocabularyMasteryBatch(tx, masteryUpdates);
          }),
        );

        const batchedMistakes = evaluation.lexicalMistakes
          .filter(
            (mistake) =>
              Boolean(mistake.lexemeId) &&
              validIds.has(mistake.lexemeId as string),
          )
          .map((mistake) => ({
            lexemeId: mistake.lexemeId as string,
            type: mistake.type,
            expected: mistake.expected,
            actual: mistake.actual,
            explanation: mistake.explanation,
          }));

        if (batchedMistakes.length) {
          await perf.span("dbWrite", () =>
            recordMistakesBatch(db, {
              userId: user.id,
              userCourseId: course.id,
              mistakes: batchedMistakes,
            }),
          );
        }

        await perf.span("grammarEvidence", async () => {
          for (const [index, observation] of acceptedGrammar.entries()) {
            const concept = grammarConceptById.get(observation.grammarConceptId);
            if (!concept) continue;

            const type = grammarMistakeTypeForCategory(concept.category);
            const isRewriteCorrection =
              observation.signal === "SUCCESS" &&
              parentErrors.has(observation.grammarConceptId);

            if (observation.signal === "ERROR") {
              await recordGrammarMistake({
                userId: user.id,
                userCourseId: course.id,
                grammarConceptId: observation.grammarConceptId,
                type,
                expected: observation.corrected ?? "",
                actual: observation.original,
                explanation: observation.explanation,
              });
            } else if (isRewriteCorrection) {
              await resolveGrammarMistakes({
                userId: user.id,
                userCourseId: course.id,
                grammarConceptId: observation.grammarConceptId,
                type,
              });
            }

            await recordGrammarEvidence({
              userId: user.id,
              userCourseId: course.id,
              grammarConceptId: observation.grammarConceptId,
              source: "WRITING",
              outcome: writingEvidenceOutcome(observation.signal),
              dimension: "FREE_PRODUCTION",
              strength: writingObservationStrength(
                observation,
                isRewriteCorrection,
              ),
              confidence: observation.confidence,
              dedupeKey:
                "writing:" +
                session.id +
                ":" +
                observation.grammarConceptId +
                ":" +
                observation.signal +
                ":" +
                index,
              sourceRef: session.id,
              excerpt: observation.original,
              metadata: {
                signal: observation.signal,
                ...(observation.corrected
                  ? { corrected: observation.corrected }
                  : {}),
                rewriteCorrection: isRewriteCorrection,
              },
            });
          }
        });

        await perf.span("revalidation", async () => {
          revalidateUserDomains(
            user.id,
            course.id,
            ["home", "vocabulary", "progress", "mistakes", "writing"],
            [...requiredIds],
          );
          revalidatePath("/writing/" + session.id);
          revalidatePath("/writing");
        });

        return {
          status: "success",
          message: "Writing evaluated.",
          sessionId: session.id,
        };
      } catch (error) {
        perf.fail(error);
        return {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not evaluate writing.",
        };
      }
    },
  );
}

export async function createRewriteAction(
  _previous: WritingActionState,
  formData: FormData,
): Promise<WritingActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");

  return instrumentOperation(
    "writing.rewrite",
    { hasSessionId: Boolean(sessionId) },
    async (perf) => {
      try {
        const [user, course] = await Promise.all([
          perf.span("auth", () => getCurrentUser()),
          perf.span("course", () => getCurrentCourse()),
        ]);
        const source = await perf.span("dbRead", () =>
          db.writingSession.findFirst({
            where: {
              id: sessionId,
              userId: user.id,
              userCourseId: course.id,
              status: "EVALUATED",
            },
            include: { targets: { orderBy: { position: "asc" } } },
          }),
        );
        if (!source) {
          return {
            status: "error",
            message: "Evaluated writing not found.",
          };
        }

        const rewrite = await perf.span("dbWrite", () =>
          db.writingSession.create({
            data: {
              userId: user.id,
              userCourseId: course.id,
              parentId: source.parentId ?? source.id,
              mode: source.mode,
              level: source.level,
              taskType: source.taskType,
              topic: source.topic,
              targetWords: source.targetWords,
              task: source.task,
              targets: {
                create: source.targets.map((target) => ({
                  lexemeId: target.lexemeId,
                  position: target.position,
                })),
              },
            },
          }),
        );

        revalidateUserDomains(user.id, course.id, ["writing"]);

        return {
          status: "success",
          message: "Rewrite ready.",
          sessionId: rewrite.id,
        };
      } catch (error) {
        perf.fail(error);
        return {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not create rewrite.",
        };
      }
    },
  );
}
