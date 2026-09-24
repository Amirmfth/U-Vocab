"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateWritingTask } from "@/lib/ai/writing-task";
import { evaluateWriting } from "@/lib/ai/writing-evaluator";
import { recordMistakes } from "@/lib/mistakes";

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
      include: {
        items: {
          include: { lexeme: { include: { patterns: true } } },
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
    include: { lexeme: { include: { patterns: true } } },
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
  const mode = String(formData.get("mode") ?? "GUIDED") === "OPEN" ? "OPEN" : "GUIDED";
  const level = String(formData.get("level") ?? "B2");
  const taskType = String(formData.get("taskType") ?? "essay");
  const topic = String(formData.get("topic") ?? "").trim() || "Alltag und Gesellschaft";
  const targetWords = Math.max(60, Math.min(500, Number(formData.get("targetWords") ?? 120) || 120));
  const rawCollection = String(formData.get("collectionId") ?? "").trim();
  const collectionId = rawCollection && rawCollection !== "NONE" ? rawCollection : null;

  try {
    const user = await getCurrentUser();
    const targets =
      mode === "GUIDED"
        ? await selectGuidedTargets({
            userId: user.id,
            collectionId,
            limit: 6,
          })
        : [];

    const generated = await generateWritingTask({
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
    });

    const task = [
      generated.title,
      generated.task,
      "",
      "Checklist:",
      ...generated.checklist.map((item) => "- " + item),
    ].join("\n");

    const session = await db.writingSession.create({
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
    });

    return {
      status: "success",
      message: "Writing task ready.",
      sessionId: session.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not create writing task.",
    };
  }
}

async function detectKnownLexemes(userId: string, draft: string) {
  const vocabulary = await db.userVocabulary.findMany({
    where: { userId },
    include: { lexeme: { include: { patterns: true } } },
    orderBy: { addedAt: "desc" },
    take: 300,
  });

  const haystack = " " + draft.toLocaleLowerCase("de-DE") + " ";
  return vocabulary
    .filter((item) => {
      const needle = item.lexeme.lemma.toLocaleLowerCase("de-DE").trim();
      return needle.length >= 3 && haystack.includes(needle);
    })
    .slice(0, 30)
    .map((item) => ({
      id: item.lexemeId,
      lemma: item.lexeme.lemma,
      patterns: item.lexeme.patterns.map((pattern) => pattern.pattern),
    }));
}

export async function evaluateWritingAction(
  _previous: WritingActionState,
  formData: FormData,
): Promise<WritingActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const draft = String(formData.get("draft") ?? "").trim();

  if (draft.length < 40) {
    return { status: "error", message: "Write a little more before evaluation." };
  }

  try {
    const user = await getCurrentUser();
    const session = await db.writingSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: {
        targets: {
          include: { lexeme: { include: { patterns: true } } },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!session) return { status: "error", message: "Writing session not found." };

    const observed = await detectKnownLexemes(user.id, draft);
    const lexical = new Map(
      session.targets.map((target) => [
        target.lexemeId,
        {
          id: target.lexemeId,
          lemma: target.lexeme.lemma,
          patterns: target.lexeme.patterns.map((pattern) => pattern.pattern),
        },
      ]),
    );
    for (const item of observed) lexical.set(item.id, item);
    const lexicalContext = Array.from(lexical.values()).slice(0, 35);

    const evaluation = await evaluateWriting({
      userId: user.id,
      level: session.level,
      mode: session.mode,
      taskType: session.taskType,
      task: session.task,
      targetWords: session.targetWords,
      draft,
      targets: lexicalContext.map((item) => ({
        lexemeId: item.id,
        lemma: item.lemma,
        patterns: item.patterns,
      })),
    });

    const validIds = new Set(lexicalContext.map((item) => item.id));
    const usageById = new Map(
      evaluation.targetUsage
        .filter((item) => validIds.has(item.lexemeId))
        .map((item) => [item.lexemeId, item]),
    );

    await db.$transaction(async (tx) => {
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

      for (const item of observed) {
        await tx.writingTarget.upsert({
          where: {
            writingSessionId_lexemeId: {
              writingSessionId: session.id,
              lexemeId: item.id,
            },
          },
          create: {
            writingSessionId: session.id,
            lexemeId: item.id,
            position: session.targets.length + lexicalContext.indexOf(item),
          },
          update: {},
        });
      }

      for (const item of lexicalContext) {
        const usage = usageById.get(item.id);
        if (!usage?.used) continue;

        const userVocabulary = await tx.userVocabulary.findUnique({
          where: { userId_lexemeId: { userId: user.id, lexemeId: item.id } },
        });

        await tx.attempt.create({
          data: {
            userId: user.id,
            userVocabularyId: userVocabulary?.id ?? null,
            exerciseType: "FREE_SENTENCE",
            prompt: "Use vocabulary naturally in a German writing task.",
            answer: draft,
            expected: item.lemma,
            correct: usage.correct,
            score: usage.naturalness,
            feedback: usage.note,
          },
        });

        if (userVocabulary) {
          await tx.userVocabulary.update({
            where: { id: userVocabulary.id },
            data: {
              production: Math.max(
                0,
                Math.min(1, userVocabulary.production + (usage.correct ? 0.08 : -0.02)),
              ),
              contextualUsage: Math.max(
                0,
                Math.min(1, userVocabulary.contextualUsage + (usage.correct ? 0.08 : -0.015)),
              ),
            },
          });
        }
      }
    });

    const mistakesByLexeme = new Map<string, typeof evaluation.lexicalMistakes>();
    for (const mistake of evaluation.lexicalMistakes) {
      if (!mistake.lexemeId || !validIds.has(mistake.lexemeId)) continue;
      mistakesByLexeme.set(mistake.lexemeId, [
        ...(mistakesByLexeme.get(mistake.lexemeId) ?? []),
        mistake,
      ]);
    }

    for (const [lexemeId, mistakes] of mistakesByLexeme) {
      await recordMistakes(db, {
        userId: user.id,
        lexemeId,
        embed: false,
        mistakes: mistakes.map((mistake) => ({
          type: mistake.type,
          expected: mistake.expected,
          actual: mistake.actual,
          explanation: mistake.explanation,
        })),
      });
    }

    revalidatePath("/writing/" + session.id);
    revalidatePath("/writing");

    return {
      status: "success",
      message: "Writing evaluated.",
      sessionId: session.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not evaluate writing.",
    };
  }
}

export async function createRewriteAction(
  _previous: WritingActionState,
  formData: FormData,
): Promise<WritingActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");

  try {
    const user = await getCurrentUser();
    const source = await db.writingSession.findFirst({
      where: { id: sessionId, userId: user.id, status: "EVALUATED" },
      include: { targets: { orderBy: { position: "asc" } } },
    });
    if (!source) return { status: "error", message: "Evaluated writing not found." };

    const rewrite = await db.writingSession.create({
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
    });

    return {
      status: "success",
      message: "Rewrite ready.",
      sessionId: rewrite.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not create rewrite.",
    };
  }
}
