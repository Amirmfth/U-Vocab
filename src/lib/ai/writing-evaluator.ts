import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
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
  strengths: z.array(z.string()).max(6),
  improvements: z.array(z.string()).max(8),
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
  collocationFeedback: z.array(z.string()).max(8),
  lexicalMistakes: z.array(lexicalMistakeSchema).max(20),
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
  improvedVersion: z.string(),
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
  targets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
  }>;
}) {
  const perf = startOperation("ai.writing_evaluation", { model: AI_MODEL, draftChars: input.draft.length, targetCount: input.targets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "writing_evaluation",
    model: AI_MODEL,
    metadata: { level: input.level, mode: input.mode, draftWords: input.draft.trim() ? input.draft.trim().split(/\s+/u).length : 0, targetCount: input.targets.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Evaluate this German writing practice. Scores are internal learning signals only, never official CEFR certification. Assess task completion, organization/coherence, grammar, vocabulary range, lexical accuracy/naturalness, repetition, collocations, and supplied target vocabulary. Only create lexicalMistakes for vocabulary-related errors. targetUsage must use only supplied lexeme IDs. Give concise corrections and a polished improved version that preserves the learner's intended content.",
        },
        { role: "user", content: JSON.stringify(input) },
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
