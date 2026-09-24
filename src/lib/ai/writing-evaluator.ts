import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

const lexicalMistakeSchema = z.object({
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
  lexemeId: z.string().nullable(),
  expected: z.string().nullable(),
  actual: z.string().nullable(),
  explanation: z.string(),
});

export const writingEvaluationSchema = z.object({
  taskCompletion: z.number().min(0).max(1),
  organization: z.number().min(0).max(1),
  grammar: z.number().min(0).max(1),
  vocabularyRange: z.number().min(0).max(1),
  vocabularyAccuracy: z.number().min(0).max(1),
  naturalness: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
  summary: z.string(),
  strengths: z.array(z.string().max(280)).max(4),
  improvements: z.array(z.string().max(320)).max(5),
  targetUsage: z.array(
    z.object({
      lexemeId: z.string(),
      used: z.boolean(),
      correct: z.boolean(),
      naturalness: z.number().min(0).max(1),
      note: z.string(),
    }),
  ),
  repetition: z.array(
    z.object({
      item: z.string(),
      count: z.number().int().min(2),
      suggestion: z.string(),
    }),
  ).max(8),
  collocationFeedback: z.array(z.string().max(280)).max(5),
  lexicalMistakes: z.array(lexicalMistakeSchema).max(12),
  strongerVocabulary: z.array(
    z.object({
      german: z.string(),
      meaning: z.string(),
      rationale: z.string(),
    }),
  ).max(8),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    }),
  ).max(12),
  improvedVersion: z.string().max(4000),
});

export type WritingEvaluation = z.infer<typeof writingEvaluationSchema>;

export async function evaluateWriting(input: {
  userId: string;
  level: string;
  mode: "GUIDED" | "OPEN";
  taskType: string;
  task: string;
  targetWords: number;
  draft: string;
  precomputedWordCount: number;
  repeatedWords: Array<{ word: string; count: number }>;
  targets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
  }>;
}) {
  const route = aiRoute("writing_evaluation");
  const perf = startOperation("ai.writing_evaluation", { model: route.model, draftChars: input.draft.length, targetCount: input.targets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "writing_evaluation",
    model: route.model,
    metadata: { level: input.level, mode: input.mode, draftWords: input.draft.trim() ? input.draft.trim().split(/\s+/u).length : 0, targetCount: input.targets.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Evaluate this German writing practice. Scores are internal learning signals only. Word count and repeated-word counts are precomputed; use them instead of recounting. Judge grammar, organization, lexical accuracy/naturalness, collocations, and supplied targets. targetUsage must use only supplied lexeme IDs. Keep feedback prioritized and concise: at most four strengths, five improvements, five collocation notes, twelve lexical mistakes, eight corrections, and a concise improved version preserving the learner intent.",
        },
        { role: "user", content: JSON.stringify({ ...input, userId: undefined }) },
      ],
      text: {
        format: zodTextFormat(writingEvaluationSchema, "writing_evaluation"),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid writing evaluation.");
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
    await usageRecorder.failure(error);
    throw error;
  }
}
