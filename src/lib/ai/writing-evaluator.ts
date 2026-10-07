import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute, writingEvaluationComplexity } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { evaluationLanguageInstruction, type EvaluationLocale } from "@/lib/evaluation-locale";
import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";
import { evaluateWritingWithDecisions } from "./decisions/writing-preflight";
import {
  decisionRolloutMode,
  shouldRunNativeDecision,
  shouldUseNativeDecision,
} from "./decisions/mode";
import {
  evaluatorMistakeSchema,
  masteryEvidenceSchema,
} from "./evaluation-intelligence";

export const writingGrammarObservationSchema = z.object({
  grammarConceptId: z.string(),
  signal: z.enum(["ERROR", "SUCCESS", "OPPORTUNITY"]),
  original: z.string().max(400),
  corrected: z.string().max(400).nullable(),
  explanation: z.string().max(500),
  confidence: z.number().min(0).max(1),
});

const lexicalMistakeSchema = evaluatorMistakeSchema.extend({
  lexemeId: z.string().nullable(),
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
      confidence: z.number().min(0).max(1),
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
  masteryEvidence: masteryEvidenceSchema,
  grammarObservations: z.array(writingGrammarObservationSchema).max(16),
  strongerVocabulary: z.array(
    z.object({
      targetText: z.string(),
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
  userCourseId: string;
  targetLanguage: TargetLanguage;
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
  grammarConcepts: Array<{
    id: string;
    title: string;
    shortDescription: string;
    introducedAt: string;
    status: string;
  }>;
  rewriteContext?: {
    previousDraft: string;
    previousWordCount: number;
    previousEvaluation?: Pick<WritingEvaluation, "overall" | "summary" | "improvements" | "corrections" | "grammarObservations">;
  };
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const decisionMode = decisionRolloutMode(
    "OPENAI_DECISIONS_WRITING_MODE",
    false,
  );
  const writingDecision = shouldRunNativeDecision(decisionMode)
    ? await evaluateWritingWithDecisions({
        userId: input.userId,
        userCourseId: input.userCourseId,
        targetLanguage: input.targetLanguage,
        level: input.level,
        task: input.task,
        draft: input.draft,
        targetWords: input.targetWords,
        repeatedWords: input.repeatedWords,
        requiredTargets: input.requiredTargets,
      })
    : null;
  const heuristicComplexity = writingEvaluationComplexity({
    draftChars: input.draft.length,
    level: input.level,
    targetCount: input.requiredTargets.length,
  });
  const complexity =
    shouldUseNativeDecision(decisionMode) && writingDecision?.status === "ok"
      ? writingDecision.data.complexity
      : heuristicComplexity;
  const route = aiRoute("writing_evaluation", { complexity });
  const perf = startOperation("ai.writing_evaluation", { model: route.model, draftChars: input.draft.length, targetCount: input.requiredTargets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "writing_evaluation",
    model: route.model,
    metadata: { level: input.level, mode: input.mode, draftWords: input.draft.trim() ? input.draft.trim().split(/\s+/u).length : 0, targetCount: input.requiredTargets.length, targetLanguage: language.code, routeReason: route.reason, decisionsMode: decisionMode, semanticComplexity: complexity },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            evaluationLanguageInstruction(input.evaluationLocale) +
            ` Evaluate this ${language.promptName} writing practice. Word count and repeated-word counts are precomputed; use them instead of recounting. Score each category from 0 to 1 using this rubric: 0.9-1.0 = consistently strong for the requested level, 0.75-0.89 = solid with minor issues, 0.55-0.74 = partly successful with clear weaknesses, 0.30-0.54 = limited control, below 0.30 = largely unsuccessful. Task completion measures fulfillment of the actual task, including an appropriate response to the target length. Organization measures structure and cohesion. Grammar measures accuracy and control in ${language.promptName}. Vocabulary range measures variety appropriate to the level. Vocabulary accuracy measures correct word choice, forms, agreement, and collocations. Naturalness measures idiomatic, context-appropriate ${language.promptName}. Evaluate requiredTargets separately: targetUsage must contain only requiredTargets' lexeme IDs, including unused required targets, and include confidence for each correctness judgment. observedVocabulary is context only and must never appear in targetUsage. If rewriteContext is present, explicitly assess whether the new draft addressed its prior feedback, but score the new draft on its own merits. The server computes overall from the category scores, so make each category score independently defensible. Feedback must be specific and evidence-based: cite the learner's exact ${language.promptName} phrase for each important strength or issue, explain the grammar/lexical/collocational/register reason, and provide a concrete corrected ${language.promptName} form when applicable. Do not import German-specific case or word-order assumptions into another language. Prioritize recurring and high-impact issues over cosmetic edits. For every lexical mistake classify a bounded cause, confidence, and intervention. Distinguish spelling slips from morphology, lexical confusion, semantic confusion, and genuine knowledge gaps. masteryEvidence is bounded evidence only; never assign canonical learner state, mastery scores, or scheduling. Do not invent errors. Strengths must say what worked and show a concrete example. Improvements must say what to change next and how. Keep feedback prioritized: at most four strengths, five improvements, five collocation notes, twelve lexical mistakes, eight corrections, and an improved version preserving the learner intent. strongerVocabulary.targetText must contain the stronger target-language expression. grammarConcepts is the ONLY allowlist of grammar IDs you may reference. grammarObservations must use only IDs from grammarConcepts. Emit ERROR only for a genuine grammatical error, SUCCESS only for a confidently observable correct use of a relevant concept, and OPPORTUNITY only when a correct sentence could naturally demonstrate a useful not-yet-mastered structure. Never penalize grammar or overall scores for an optional OPPORTUNITY. Do not label every correct token; focus on relevant LEARNING/NEEDS_ATTENTION/ASSUMED concepts and a few level-appropriate opportunities. For ERROR include corrected ${language.promptName} when possible. For SUCCESS corrected must be null. For OPPORTUNITY corrected should contain the optional improved form. If rewriteContext contains prior grammarObservations, pay particular attention to whether prior ERROR concepts were corrected, but do not duplicate an error unless it is still present.`,
        },
        { role: "user", content: JSON.stringify({ ...input, userId: undefined, userCourseId: undefined, targetLanguage: language.code }) },
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

    const allowedGrammarIds = new Set(input.grammarConcepts.map((concept) => concept.id));
    const grammarObservations = response.output_parsed.grammarObservations.filter(
      (observation) => allowedGrammarIds.has(observation.grammarConceptId),
    );

    const responseTargetUsageById = new Map(
      response.output_parsed.targetUsage.map((usage) => [usage.lexemeId, usage]),
    );
    const decisionTargetUsageById =
      shouldUseNativeDecision(decisionMode) && writingDecision?.status === "ok"
        ? new Map(
            writingDecision.data.targetUsage.map((usage) => [
              usage.lexemeId,
              usage,
            ]),
          )
        : null;
    const targetUsage = input.requiredTargets.map((target) =>
      decisionTargetUsageById?.get(target.lexemeId) ??
      responseTargetUsageById.get(target.lexemeId) ?? {
        lexemeId: target.lexemeId,
        used: false,
        correct: false,
        naturalness: 0,
        confidence: 1,
        note:
          input.evaluationLocale === "fa"
            ? "این واژهٔ هدف در این متن استفاده نشد."
            : "Not used in this draft.",
      },
    );

    const decisionScores =
      shouldUseNativeDecision(decisionMode) && writingDecision?.status === "ok"
        ? writingDecision.data.scores
        : null;
    const scored = {
      ...response.output_parsed,
      ...(decisionScores ?? {}),
      grammarObservations,
      targetUsage,
    };
    return {
      ...scored,
      overall: calculateWritingOverall(scored),
    };
  } catch (error) {
    perf.fail(error);
    await usageRecorder.failure(error);
    throw error;
  }
}
