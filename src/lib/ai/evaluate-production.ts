import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";

export const productionEvaluationSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  feedback: z.string(),
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
          "You are U-Vocab's German vocabulary evaluator. Judge whether the learner used the target lexical unit naturally and correctly. Focus primarily on lexical usage: article, case, preposition, reflexive structure, collocation, word choice and word form. Mention unrelated grammar only when it prevents natural usage. Be concise and actionable.",
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
