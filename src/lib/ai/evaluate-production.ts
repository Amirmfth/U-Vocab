import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { evaluationLanguageInstruction, type EvaluationLocale } from "@/lib/evaluation-locale";
import {
  evaluatorMistakeSchema,
  localErrorSignal,
  masteryEvidenceSchema,
} from "./evaluation-intelligence";
import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";

export const productionEvaluationSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  feedback: z.string().max(600),
  retryPrompt: z.string().max(300).nullable(),
  improvedSentence: z.string().max(600).nullable(),
  mistakes: z.array(evaluatorMistakeSchema).max(6),
  masteryEvidence: masteryEvidenceSchema,
});

export type ProductionEvaluation = z.infer<typeof productionEvaluationSchema>;

export async function evaluateVocabularyProduction(input: {
  userId: string;
  userCourseId?: string;
  targetLanguage?: TargetLanguage;
  evaluationLocale?: EvaluationLocale;
  exerciseType: string;
  exercisePrompt: string;
  expected?: string;
  lemma: string;
  partOfSpeech: string;
  patterns: string[];
  examples: string[];
  answer: string;
}) {
  const language = targetLanguageConfig(input.targetLanguage ?? "GERMAN");
  const route = aiRoute("answer_evaluation");
  const localSignal = localErrorSignal(input.expected, input.answer);
  const perf = startOperation("ai.answer_evaluation", { model: route.model, answerChars: input.answer.length, exerciseType: input.exerciseType });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "answer_evaluation",
    model: route.model,
    userCourseId: input.userCourseId,
    metadata: {
      answerChars: input.answer.length,
      exerciseType: input.exerciseType,
      patternCount: input.patterns.length,
      exampleCount: input.examples.length,
      routeReason: route.reason,
      localErrorSignal: localSignal.kind,
      targetLanguage: language.code,
    },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            evaluationLanguageInstruction(input.evaluationLocale ?? "en") +
            ` You are U-Vocab's ${language.promptName} vocabulary evaluator. Evaluate the learner's answer against the exercise goal and target lexical unit. Focus on lexical correctness, morphology, grammar tied to the lexical unit, collocation, word choice, word form, spelling, register, and naturalness. Accept valid alternatives. For every mistake classify a bounded cause, confidence, and intervention. Use localErrorSignal as strong evidence for TYPO/ORTHOGRAPHY_GAP when it says NEAR_TYPO; do not punish a near spelling slip like a semantic knowledge gap. ATTENTION_SLIP is allowed only when the response is near-correct and inconsistent with the supplied evidence, not as a psychological inference. masteryEvidence is evidence only: do not assign learner state or scheduling. Feedback must identify the exact phrase that succeeded or failed, explain why, and provide a corrected ${language.promptName} form when useful. If the answer is wrong or incomplete, provide a short retryPrompt without giving away the full answer.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            ...input,
            userId: undefined,
            userCourseId: undefined,
            targetLanguage: language.code,
            localErrorSignal: localSignal,
          }),
        },
      ],
      text: {
        format: zodTextFormat(
          productionEvaluationSchema,
          "production_evaluation",
        ),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid production evaluation.");
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    await usageRecorder.success(response);

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });

    return response.output_parsed;
  } catch (error) {
    perf.fail(error);
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid production evaluation.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
