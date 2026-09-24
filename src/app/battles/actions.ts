"use server";

import type { BattleGame, BattleMode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { battleExerciseType, buildBattleQuestions } from "@/lib/battles/engine";

export type BattleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  sessionId?: string;
};

export async function createBattleAction(
  _previous: BattleActionState,
  formData: FormData,
): Promise<BattleActionState> {
  const game = String(formData.get("game") ?? "RAPID_RECALL") as BattleGame;
  const mode = String(formData.get("mode") ?? "TIMED") as BattleMode;
  const duration =
    mode === "TIMED"
      ? Math.max(60, Math.min(180, Number(formData.get("durationSec") ?? 90)))
      : null;

  try {
    const user = await getCurrentUser();
    const questions = await buildBattleQuestions({
      userId: user.id,
      game,
      count: 10,
    });

    if (questions.length < 3) {
      return {
        status: "error",
        message:
          "Not enough suitable vocabulary is available for this battle yet.",
      };
    }

    const session = await db.battleSession.create({
      data: {
        userId: user.id,
        game,
        mode,
        durationSec: duration,
        total: questions.length,
        questions: {
          create: questions.map((question, position) => ({
            lexemeId: question.lexemeId,
            position,
            prompt: question.prompt,
            options: question.options,
            expected: question.expected,
            explanation: question.explanation,
          })),
        },
      },
    });

    return {
      status: "success",
      message: "Battle ready.",
      sessionId: session.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not create battle.",
    };
  }
}

export async function answerBattleQuestion(input: {
  sessionId: string;
  questionId: string;
  answer: string;
  responseMs: number;
}) {
  const user = await getCurrentUser();
  const question = await db.battleQuestion.findFirst({
    where: {
      id: input.questionId,
      sessionId: input.sessionId,
      session: { userId: user.id, completedAt: null },
      answeredAt: null,
    },
    include: { session: true },
  });
  if (!question) throw new Error("Question is unavailable or already answered.");

  if (
    question.session.mode === "TIMED" &&
    question.session.durationSec &&
    Date.now() - question.session.startedAt.getTime() >
      question.session.durationSec * 1000 + 5000
  ) {
    throw new Error("Time is up for this battle.");
  }

  const correct =
    question.expected.trim().toLocaleLowerCase("de-DE") ===
    input.answer.trim().toLocaleLowerCase("de-DE");

  const speedBonus =
    question.session.mode === "TIMED" && correct
      ? Math.max(0, 50 - Math.floor(input.responseMs / 200))
      : 0;
  const points = correct ? 100 + speedBonus : 0;

  const userVocabulary = question.lexemeId
    ? await db.userVocabulary.findUnique({
        where: {
          userId_lexemeId: {
            userId: user.id,
            lexemeId: question.lexemeId,
          },
        },
      })
    : null;

  await db.$transaction(async (tx) => {
    await tx.battleQuestion.update({
      where: { id: question.id },
      data: {
        answer: input.answer,
        correct,
        responseMs: Math.max(0, input.responseMs),
        answeredAt: new Date(),
      },
    });

    await tx.battleSession.update({
      where: { id: question.sessionId },
      data: {
        score: { increment: points },
        correct: correct ? { increment: 1 } : undefined,
      },
    });

    await tx.attempt.create({
      data: {
        userId: user.id,
        userVocabularyId: userVocabulary?.id ?? null,
        exerciseType: battleExerciseType(question.session.game),
        prompt: question.prompt,
        answer: input.answer,
        expected: question.expected,
        correct,
        score: correct ? 1 : 0,
        feedback: question.explanation,
        durationMs: Math.max(0, input.responseMs),
      },
    });

    if (userVocabulary) {
      const recognitionDelta = correct ? 0.035 : -0.015;
      const productionDelta =
        ["COLLOCATION", "PREPOSITION"].includes(question.session.game)
          ? correct
            ? 0.025
            : -0.01
          : 0;

      await tx.userVocabulary.update({
        where: { id: userVocabulary.id },
        data: {
          recognition: Math.max(
            0,
            Math.min(1, userVocabulary.recognition + recognitionDelta),
          ),
          production: Math.max(
            0,
            Math.min(1, userVocabulary.production + productionDelta),
          ),
        },
      });
    }
  });

  return {
    correct,
    expected: question.expected,
    explanation: question.explanation,
    points,
  };
}

export async function completeBattle(sessionId: string) {
  const user = await getCurrentUser();
  const session = await db.battleSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { questions: true },
  });
  if (!session) throw new Error("Battle not found.");

  await db.battleSession.update({
    where: { id: session.id },
    data: { completedAt: session.completedAt ?? new Date() },
  });

  revalidatePath("/battles/" + session.id);
  revalidatePath("/battles");
  return { ok: true };
}
