"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateWritingTask } from "@/lib/ai/writing-task";
import { evaluateWriting } from "@/lib/ai/writing-evaluator";
import { recordMistakesBatch } from "@/lib/mistakes-batch";
import { updateVocabularyMasteryBatch } from "@/lib/vocabulary-batch";
import { instrumentOperation } from "@/lib/performance";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { detectLexemePresence, detectRepeatedWords } from "@/lib/ai/preprocess";

export type WritingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  sessionId?: string;
};

async function selectGuidedTargets(input: {
  userId: string;
  collectionId?: string | null;
  limit: number;
}) {
  if (input.collectionId) {
    const pack = await db.topicPack.findFirst({
      where: { id: input.collectionId, userId: input.userId },
      select: {
        items: {
          select: {
            lexemeId: true,
            lexeme: {
              select: {
                lemma: true,
                patterns: { select: { pattern: true } },
              },
            },
          },
          orderBy: [{ usefulness: "desc" }, { position: "asc" }],
          take: input.limit,
        },
      },
    });
    if (pack?.items.length) {
      return pack.items.map((item) => ({
        id: item.lexemeId,
        lemma: item.lexeme.lemma,
        patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
      }));
    }
  }

  const weak = await db.userVocabulary.findMany({
    where: { userId: input.userId },
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
  const rawCollection = String(formData.get("collectionId") ?? "").trim();
  const collectionId =
    rawCollection && rawCollection !== "NONE" ? rawCollection : null;

  return instrumentOperation(
    "writing.create",
    { mode, level, taskType, targetWords, hasCollection: Boolean(collectionId) },
    async (perf) => {
      try {
        const user = await perf.span("auth", () => getCurrentUser());
        const targets =
          mode === "GUIDED"
            ? await perf.span("dbRead", () =>
                selectGuidedTargets({
                  userId: user.id,
                  collectionId,
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

        revalidateUserDomains(user.id, ["writing"]);

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

async function detectKnownLexemes(userId: string, draft: string) {
  const vocabulary = await db.userVocabulary.findMany({
    where: { userId },
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

  return db.userVocabulary.findMany({
    where: {
      userId,
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
  }).then((items) =>
    items.map((item) => ({
      id: item.lexemeId,
      lemma: item.lexeme.lemma,
      patterns: item.lexeme.patterns.map((pattern) => pattern.pattern).slice(0, 3),
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
        const user = await perf.span("auth", () => getCurrentUser());
        const session = await perf.span("dbRead", () =>
          db.writingSession.findFirst({
            where: { id: sessionId, userId: user.id },
            select: {
              id: true,
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
          detectKnownLexemes(user.id, draft),
        );
        const lexical = new Map(
          session.targets.map((target) => [
            target.lexemeId,
            {
              id: target.lexemeId,
              lemma: target.lexeme.lemma,
              patterns: target.lexeme.patterns.map(
                (pattern) => pattern.pattern,
              ),
            },
          ]),
        );
        for (const item of observed) lexical.set(item.id, item);
        const lexicalContext = Array.from(lexical.values()).slice(0, 18);
        const repetitions = detectRepeatedWords(draft);

        const evaluation = await perf.span("ai", () =>
          evaluateWriting({
            userId: user.id,
            level: session.level,
            mode: session.mode,
            taskType: session.taskType,
            task: session.task,
            targetWords: session.targetWords,
            draft,
            precomputedWordCount: countWords(draft),
            repeatedWords: repetitions,
            targets: lexicalContext.map((item) => ({
              lexemeId: item.id,
              lemma: item.lemma,
              patterns: item.patterns,
            })),
          }),
        );

        const validIds = new Set(lexicalContext.map((item) => item.id));
        const usageById = new Map(
          evaluation.targetUsage
            .filter((item) => validIds.has(item.lexemeId))
            .map((item) => [item.lexemeId, item]),
        );

        const usedLexemeIds = lexicalContext
          .filter((item) => usageById.get(item.id)?.used)
          .map((item) => item.id);

        const vocabularyRows = usedLexemeIds.length
          ? await perf.span("dbRead", () =>
              db.userVocabulary.findMany({
                where: {
                  userId: user.id,
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

        const attempts = [];
        const masteryUpdates = [];

        for (const item of lexicalContext) {
          const usage = usageById.get(item.id);
          if (!usage?.used) continue;

          const userVocabulary = vocabularyByLexeme.get(item.id);
          attempts.push({
            userId: user.id,
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
                  userVocabulary.contextualUsage + (usage.correct ? 0.08 : -0.015),
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
              mistakes: batchedMistakes,
            }),
          );
        }

        await perf.span("revalidation", async () => {
          revalidateUserDomains(
            user.id,
            ["home", "vocabulary", "progress", "mistakes", "writing"],
            lexicalContext.map((item) => item.id),
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
        const user = await perf.span("auth", () => getCurrentUser());
        const source = await perf.span("dbRead", () =>
          db.writingSession.findFirst({
            where: {
              id: sessionId,
              userId: user.id,
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
              parentId: source.id,
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

        revalidateUserDomains(user.id, ["writing"]);

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
