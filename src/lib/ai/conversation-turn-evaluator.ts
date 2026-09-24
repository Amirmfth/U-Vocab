import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

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
  const route = aiRoute("conversation_turn_evaluation");
  const perf = startOperation("ai.conversation_turn_evaluation", { model: route.model, messageChars: input.message.length, targetCount: input.targets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "conversation_turn_evaluation",
    model: route.model,
    metadata: { level: input.level, messageChars: input.message.length, targetCount: input.targets.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Evaluate only the learner's use of the supplied German target lexical units in this single message. Mark used=false when a target is not actually attempted. When used, judge lexical correctness, grammar tied to the lexical unit, collocation, case/preposition, form, spelling, and naturalness. Do not penalize unrelated grammar. relevantCorrection should be a very short conversational correction only when useful; otherwise null.",
        },
        { role: "user", content: JSON.stringify({ ...input, userId: undefined }) },
      ],
      text: {
        format: zodTextFormat(
          conversationTurnEvaluationSchema,
          "conversation_turn_evaluation",
        ),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid turn evaluation.");
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
    if (
      !(
        error instanceof Error &&
        error.message === "OpenAI did not return a valid turn evaluation."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
