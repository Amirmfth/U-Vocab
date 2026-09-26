import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { evaluationLanguageInstruction, type EvaluationLocale } from "@/lib/evaluation-locale";

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
  summary: z.string().max(700),
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
  ).max(6),
  collocationFeedback: z.array(z.string().max(280)).max(5),
  lexicalMistakes: z.array(lexicalMistakeSchema).max(12),
  strongerVocabulary: z.array(
    z.object({
      german: z.string(),
      meaning: z.string(),
      rationale: z.string(),
    }),
  ).max(5),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    }),
  ).max(8),
  improvedVersion: z.string().max(4000),
});

export type WritingEvaluation = z.infer<typeof writingEvaluationSchema>;

export function calculateWritingOverall(evaluation: Omit<WritingEvaluation, "overall">) {
  const weighted =
    evaluation.taskCompletion * 0.2 +
    evaluation.organization * 0.15 +
    evaluation.grammar * 0.25 +
    evaluation.vocabularyRange * 0.15 +
    evaluation.vocabularyAccuracy * 0.15 +
    evaluation.naturalness * 0.1;
  return Math.round(Math.max(0, Math.min(1, weighted)) * 100) / 100;
}

export async function evaluateWriting(input: {
  userId: string;
  evaluationLocale: EvaluationLocale;
  level: string;
  mode: "GUIDED" | "OPEN";
  taskType: string;
  task: string;
  targetWords: number;
  draft: string;
  precomputedWordCount: number;
  repeatedWords: Array<{ word: string; count: number }>;
  requiredTargets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
  }>;
  observedVocabulary: Array<{ lemma: string; patterns: string[] }>;
  rewriteContext?: {
    previousDraft: string;
    previousWordCount: number;
    previousEvaluation?: Pick<WritingEvaluation, "overall" | "summary" | "improvements" | "corrections">;
  };
}) {
  const route = aiRoute("writing_evaluation");
  const perf = startOperation("ai.writing_evaluation", { model: route.model, draftChars: input.draft.length, targetCount: input.requiredTargets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "writing_evaluation",
    model: route.model,
    metadata: { level: input.level, mode: input.mode, draftWords: input.draft.trim() ? input.draft.trim().split(/\s+/u).length : 0, targetCount: input.requiredTargets.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Evaluate this German writing practice. Word count and repeated-word counts are precomputed; use them instead of recounting. Score each category from 0 to 1 using this rubric: 0.9-1.0 = consistently strong for the requested level, 0.75-0.89 = solid with minor issues, 0.55-0.74 = partly successful with clear weaknesses, 0.30-0.54 = limited control, below 0.30 = largely unsuccessful. Task completion measures fulfillment of the actual task, including an appropriate response to the target length. Organization measures structure and cohesion. Grammar measures accuracy and control. Vocabulary range measures variety appropriate to the level. Vocabulary accuracy measures correct word choice, forms, and collocations. Naturalness measures idiomatic, context-appropriate German. Evaluate requiredTargets separately: targetUsage must contain only requiredTargets' lexeme IDs, including unused required targets. observedVocabulary is context only and must never appear in targetUsage. If rewriteContext is present, explicitly assess whether the new draft addressed its prior feedback, but score the new draft on its own merits. The server computes overall from the category scores, so make each category score independently defensible. Keep feedback prioritized and concise: at most four strengths, five improvements, five collocation notes, twelve lexical mistakes, eight corrections, and an improved version preserving the learner intent.",
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

    const targetUsageById = new Map(
      response.output_parsed.targetUsage.map((usage) => [usage.lexemeId, usage]),
    );
    const targetUsage = input.requiredTargets.map((target) =>
      targetUsageById.get(target.lexemeId) ?? {
        lexemeId: target.lexemeId,
        used: false,
        correct: false,
        naturalness: 0,
        note: "Not used in this draft.",
      },
    );

    return {
      ...response.output_parsed,
      targetUsage,
      overall: calculateWritingOverall(response.output_parsed),
    };
  } catch (error) {
    perf.fail(error);
    await usageRecorder.failure(error);
    throw error;
  }
}
