import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";

export const conversationTurnEvaluationSchema = z.object({
  targetUsage: z.array(
    z.object({
      lexemeId: z.string(),
      used: z.boolean(),
      correct: z.boolean(),
      score: z.number().min(0).max(1),
      feedback: z.string(),
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
    }),
  ),
  relevantCorrection: z.string().nullable(),
});

export type ConversationTurnEvaluation = z.infer<
  typeof conversationTurnEvaluationSchema
>;

export async function evaluateConversationTurn(input: {
  userId: string;
  level: string;
  message: string;
  targets: Array<{
    lexemeId: string;
    lemma: string;
    patterns: string[];
  }>;
}) {
  try {
    const response = await getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Evaluate only the learner's use of the supplied German target lexical units in this single message. Mark used=false when a target is not actually attempted. When used, judge lexical correctness, grammar tied to the lexical unit, collocation, case/preposition, form, spelling, and naturalness. Do not penalize unrelated grammar. relevantCorrection should be a very short conversational correction only when useful; otherwise null.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: {
        format: zodTextFormat(
          conversationTurnEvaluationSchema,
          "conversation_turn_evaluation",
        ),
      },
    });

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "conversation_turn_evaluation",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed turn evaluation.",
      });
      throw new Error("OpenAI did not return a valid turn evaluation.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "conversation_turn_evaluation",
      model: AI_MODEL,
      status: "SUCCESS",
      usage: response.usage,
      requestId: response.id,
    });

    return response.output_parsed;
  } catch (error) {
    if (
      !(
        error instanceof Error &&
        error.message === "OpenAI did not return a valid turn evaluation."
      )
    ) {
      await recordAIUsage({
        userId: input.userId,
        operation: "conversation_turn_evaluation",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
