import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute, conversationFinalComplexity } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { evaluationLanguageInstruction, type EvaluationLocale } from "@/lib/evaluation-locale";
import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";
import { scoreConversationFinalWithDecisions } from "./decisions/conversation-final";
import {
  decisionRolloutMode,
  shouldRunNativeDecision,
  shouldUseNativeDecision,
} from "./decisions/mode";
import {
  evaluatorMistakeSchema,
  masteryEvidenceSchema,
} from "./evaluation-intelligence";

export const conversationFinalEvaluationSchema = z.object({
  taskSuccess: z.boolean(),
  overallScore: z.number().min(0).max(1),
  grammarScore: z.number().min(0).max(1),
  naturalnessScore: z.number().min(0).max(1),
  vocabularyScore: z.number().min(0).max(1),
  summary: z.string(),
  strengths: z.array(z.string()).max(6),
  improvements: z.array(z.string()).max(6),
  mistakes: z.array(evaluatorMistakeSchema).max(10),
  masteryEvidence: masteryEvidenceSchema,
  targetResults: z.array(
    z.object({
      lexemeId: z.string(),
      used: z.boolean(),
      correct: z.boolean(),
      naturalness: z.number().min(0).max(1),
      note: z.string(),
    }),
  ),
});

export type ConversationFinalEvaluation = z.infer<
  typeof conversationFinalEvaluationSchema
>;

export async function evaluateConversationSession(input: {
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
  evaluationLocale: EvaluationLocale;
  kind: "PRACTICE" | "MISSION";
  level: string;
  scenario: string;
  objective: string | null;
  targets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
    uses: number;
    successfulUses: number;
  }>;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const decisionMode = decisionRolloutMode(
    "OPENAI_DECISIONS_CONVERSATION_FINAL_MODE",
    false,
  );
  const decisionScoring = shouldRunNativeDecision(decisionMode)
    ? await scoreConversationFinalWithDecisions(input)
    : null;
  const route = aiRoute("conversation_final_evaluation", {
    complexity: conversationFinalComplexity({
      messageCount: input.messages.length,
      level: input.level,
      targetCount: input.targets.length,
    }),
  });
  const perf = startOperation("ai.conversation_final_evaluation", { model: route.model, messageCount: input.messages.length, targetCount: input.targets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "conversation_final_evaluation",
    model: route.model,
    metadata: { level: input.level, messageCount: input.messages.length, targetCount: input.targets.length, kind: input.kind, targetLanguage: language.code, routeReason: route.reason, decisionsMode: decisionMode },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            evaluationLanguageInstruction(input.evaluationLocale) + ` Evaluate the completed ${language.promptName} conversation. For a mission, taskSuccess means the conversational objective was actually achieved, not merely mentioned. Assess ${language.promptName} grammar, naturalness, vocabulary, and each target lexical unit. Feedback must be specific and evidence-based: reference concrete learner utterances, identify the exact grammar/word-choice/collocation/register issue, explain why it matters, and provide a corrected ${language.promptName} phrase where useful. Strengths must also cite concrete successful language use. Prioritize patterns and high-impact issues rather than generic advice. Return a bounded mistake list with cause, confidence, and intervention classifications, and bounded masteryEvidence that application code may treat as evidence only. Distinguish orthographic slips from lexical/semantic knowledge gaps. Be constructive and concise. Do not treat the score as an official CEFR assessment.`,
        },
        { role: "user", content: JSON.stringify({ ...input, userId: undefined, userCourseId: undefined, targetLanguage: language.code }) },
      ],
      text: {
        format: zodTextFormat(
          conversationFinalEvaluationSchema,
          "conversation_final_evaluation",
        ),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid conversation evaluation.");
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    await usageRecorder.success(response);

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });

    if (shouldUseNativeDecision(decisionMode) && decisionScoring?.status === "ok") {
      return {
        ...response.output_parsed,
        ...decisionScoring.data,
      };
    }
    return response.output_parsed;
  } catch (error) {
    perf.fail(error);
    if (
      !(
        error instanceof Error &&
        error.message === "OpenAI did not return a valid conversation evaluation."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
