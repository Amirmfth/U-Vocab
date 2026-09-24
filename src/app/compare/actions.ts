"use server";

import { revalidatePath } from "next/cache";
import { comparisonSchema } from "@/lib/ai/compare-words";
import { generateWordComparison } from "@/lib/ai/compare-words";
import { evaluateVocabularyProduction } from "@/lib/ai/evaluate-production";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { recordMistakes } from "@/lib/mistakes";

export type CompareCreateState = {
  status: "idle" | "success" | "error";
  message?: string;
  pairId?: string;
};

function normalizePair(leftId: string, rightId: string) {
  return leftId < rightId ? [leftId, rightId] : [rightId, leftId];
}

export async function generateComparisonAction(
  _previous: CompareCreateState,
  formData: FormData,
): Promise<CompareCreateState> {
  const rawLeft = String(formData.get("leftLexemeId") ?? "");
  const rawRight = String(formData.get("rightLexemeId") ?? "");
  if (!rawLeft || !rawRight || rawLeft === rawRight) {
    return { status: "error", message: "Choose two different lexical units." };
  }

  try {
    const user = await getCurrentUser();
    const [leftId, rightId] = normalizePair(rawLeft, rawRight);
    const words = await db.lexeme.findMany({
      where: {
        id: { in: [leftId, rightId] },
        userStates: { some: { userId: user.id } },
      },
      include: { patterns: true, examples: { take: 4 } },
    });

    if (words.length !== 2) {
      return { status: "error", message: "Both words must be in your vocabulary." };
    }

    const left = words.find((word) => word.id === leftId)!;
    const right = words.find((word) => word.id === rightId)!;

    const content = await generateWordComparison({
      userId: user.id,
      level: user.targetLevel,
      left: {
        lemma: left.lemma,
        article: left.article,
        partOfSpeech: left.partOfSpeech,
        patterns: left.patterns.map((item) => item.pattern),
        examples: left.examples.map((item) => item.german),
      },
      right: {
        lemma: right.lemma,
        article: right.article,
        partOfSpeech: right.partOfSpeech,
        patterns: right.patterns.map((item) => item.pattern),
        examples: right.examples.map((item) => item.german),
      },
    });

    const pair = await db.confusionPair.upsert({
      where: {
        userId_leftLexemeId_rightLexemeId: {
          userId: user.id,
          leftLexemeId: leftId,
          rightLexemeId: rightId,
        },
      },
      create: {
        userId: user.id,
        leftLexemeId: leftId,
        rightLexemeId: rightId,
        content,
      },
      update: {
        content,
        state: "TRACKED",
      },
    });

    revalidatePath("/compare");
    return {
      status: "success",
      message: "Comparison generated.",
      pairId: pair.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not generate comparison.",
    };
  }
}

async function updatePairProgress(pairId: string, userId: string, correct: boolean) {
  await db.$transaction(async (tx) => {
    const pair = await tx.confusionPair.findFirst({
      where: { id: pairId, userId },
    });
    if (!pair) throw new Error("Comparison not found.");

    const updated = await tx.confusionPair.update({
      where: { id: pair.id },
      data: {
        attempts: { increment: 1 },
        correctAttempts: correct ? { increment: 1 } : undefined,
        lastPracticedAt: new Date(),
      },
    });

    const learned =
      updated.attempts >= 4 &&
      updated.correctAttempts / updated.attempts >= 0.8;

    if (
      updated.state !== (learned ? "LEARNED" : "TRACKED") ||
      (learned && !updated.learnedAt)
    ) {
      await tx.confusionPair.update({
        where: { id: pair.id },
        data: {
          state: learned ? "LEARNED" : "TRACKED",
          learnedAt: learned ? updated.learnedAt ?? new Date() : null,
        },
      });
    }
  });
}

export async function recordComparisonChoice(input: {
  pairId: string;
  questionIndex: number;
  selected: "LEFT" | "RIGHT";
}) {
  const user = await getCurrentUser();
  const pair = await db.confusionPair.findFirst({
    where: { id: input.pairId, userId: user.id },
    include: { leftLexeme: true, rightLexeme: true },
  });
  if (!pair?.content) throw new Error("Comparison not found.");

  const parsed = comparisonSchema.safeParse(pair.content);
  if (!parsed.success) throw new Error("Comparison content is invalid.");

  const question = parsed.data.discrimination[input.questionIndex];
  if (!question) throw new Error("Question not found.");

  const correct = input.selected === question.answer;
  const targetId =
    question.answer === "LEFT" ? pair.leftLexemeId : pair.rightLexemeId;
  const userVocabulary = await db.userVocabulary.findUnique({
    where: { userId_lexemeId: { userId: user.id, lexemeId: targetId } },
  });

  await db.attempt.create({
    data: {
      userId: user.id,
      userVocabularyId: userVocabulary?.id ?? null,
      exerciseType: "CONTEXTUAL_CHOICE",
      prompt: question.prompt,
      answer: input.selected === "LEFT" ? pair.leftLexeme.lemma : pair.rightLexeme.lemma,
      expected: question.answer === "LEFT" ? pair.leftLexeme.lemma : pair.rightLexeme.lemma,
      correct,
      score: correct ? 1 : 0,
      feedback: question.explanation,
    },
  });

  await updatePairProgress(pair.id, user.id, correct);
  revalidatePath("/compare/" + pair.id);

  return {
    correct,
    explanation: question.explanation,
    expected:
      question.answer === "LEFT" ? pair.leftLexeme.lemma : pair.rightLexeme.lemma,
  };
}

export async function evaluateComparisonProduction(input: {
  pairId: string;
  target: "LEFT" | "RIGHT";
  answer: string;
}) {
  const answer = input.answer.trim();
  if (!answer) throw new Error("Write a sentence first.");

  const user = await getCurrentUser();
  const pair = await db.confusionPair.findFirst({
    where: { id: input.pairId, userId: user.id },
    include: {
      leftLexeme: { include: { patterns: true, examples: true } },
      rightLexeme: { include: { patterns: true, examples: true } },
    },
  });
  if (!pair?.content) throw new Error("Comparison not found.");

  const parsed = comparisonSchema.safeParse(pair.content);
  if (!parsed.success) throw new Error("Comparison content is invalid.");
  const prompt =
    input.target === "LEFT"
      ? parsed.data.production.leftPrompt
      : parsed.data.production.rightPrompt;

  const lexeme = input.target === "LEFT" ? pair.leftLexeme : pair.rightLexeme;
  const userVocabulary = await db.userVocabulary.findUnique({
    where: { userId_lexemeId: { userId: user.id, lexemeId: lexeme.id } },
  });

  const evaluation = await evaluateVocabularyProduction({
    userId: user.id,
    exerciseType: "FREE_SENTENCE",
    exercisePrompt: prompt,
    lemma: lexeme.lemma,
    partOfSpeech: lexeme.partOfSpeech,
    patterns: lexeme.patterns.map((item) => item.pattern),
    examples: lexeme.examples.map((item) => item.german),
    answer,
  });

  await db.attempt.create({
    data: {
      userId: user.id,
      userVocabularyId: userVocabulary?.id ?? null,
      exerciseType: "FREE_SENTENCE",
      prompt: prompt,
      answer,
      correct: evaluation.correct,
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  });

  await recordMistakes(db, {
    userId: user.id,
    lexemeId: lexeme.id,
    mistakes: evaluation.mistakes,
  });

  await updatePairProgress(pair.id, user.id, evaluation.correct);
  revalidatePath("/compare/" + pair.id);

  return {
    correct: evaluation.correct,
    score: evaluation.score,
    feedback: evaluation.feedback,
    improvedSentence: evaluation.improvedSentence,
  };
}
