import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { evaluationLanguageInstruction, type EvaluationLocale } from "@/lib/evaluation-locale";

export const productionEvaluationSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  feedback: z.string().max(600),
  retryPrompt: z.string().max(300).nullable(),
  improvedSentence: z.string().max(600).nullable(),
  mistakes: z.array(
    z.object({
      type: z.enum([
        "ARTICLE",
        "CASE",
        "PREPOSITION",
        "REFLEXIVE",
        "COLLOCATION",
        "WORD_CHOICE",
        "WORD_FORM",
        "SPELLING",
        "OTHER",
      ]),
      expected: z.string().nullable(),
      actual: z.string().nullable(),
      explanation: z.string(),
    }),
  ).max(6),
});

export type ProductionEvaluation = z.infer<typeof productionEvaluationSchema>;

export async function evaluateVocabularyProduction(input: {
  userId: string;
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
  const route = aiRoute("answer_evaluation");
  const perf = startOperation("ai.answer_evaluation", { model: route.model, answerChars: input.answer.length, exerciseType: input.exerciseType });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "answer_evaluation",
    model: route.model,
    metadata: { answerChars: input.answer.length, exerciseType: input.exerciseType, patternCount: input.patterns.length, exampleCount: input.examples.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "You are U-Vocab's German vocabulary evaluator. Evaluate the learner's answer against the exercise goal and target lexical unit. Focus on lexical correctness, article, case, preposition, reflexive structure, collocation, word choice, word form, spelling, and naturalness. Accept valid alternatives. Give concise actionable feedback. If the answer is wrong or incomplete, provide a short retryPrompt that asks the learner to try again without simply giving away the full answer.",
        },
        {
          role: "user",
          content: JSON.stringify({ ...input, userId: undefined }),
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
