import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";

export const productionEvaluationSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  feedback: z.string(),
  retryPrompt: z.string().nullable(),
  improvedSentence: z.string().nullable(),
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
  ),
});

export type ProductionEvaluation = z.infer<typeof productionEvaluationSchema>;

export async function evaluateVocabularyProduction(input: {
  exerciseType: string;
  exercisePrompt: string;
  expected?: string;
  lemma: string;
  partOfSpeech: string;
  patterns: string[];
  examples: string[];
  answer: string;
}) {
  const response = await getOpenAI().responses.parse({
    model: AI_MODEL,
    input: [
      {
        role: "system",
        content:
          "You are U-Vocab's German vocabulary evaluator. Evaluate the learner's answer against the exercise goal and target lexical unit. Focus on lexical correctness, article, case, preposition, reflexive structure, collocation, word choice, word form, spelling, and naturalness. Accept valid alternatives. Give concise actionable feedback. If the answer is wrong or incomplete, provide a short retryPrompt that asks the learner to try again without simply giving away the full answer.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    text: {
      format: zodTextFormat(
        productionEvaluationSchema,
        "production_evaluation",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI did not return a valid production evaluation.");
  }

  return response.output_parsed;
}
