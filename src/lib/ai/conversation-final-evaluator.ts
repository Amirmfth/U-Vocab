import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

export const conversationFinalEvaluationSchema = z.object({
  taskSuccess: z.boolean(),
  overallScore: z.number().min(0).max(1),
  grammarScore: z.number().min(0).max(1),
  naturalnessScore: z.number().min(0).max(1),
  vocabularyScore: z.number().min(0).max(1),
  summary: z.string(),
  strengths: z.array(z.string()).max(6),
  improvements: z.array(z.string()).max(6),
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
  const route = aiRoute("conversation_final_evaluation");
  const perf = startOperation("ai.conversation_final_evaluation", { model: route.model, messageCount: input.messages.length, targetCount: input.targets.length, level: input.level });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "conversation_final_evaluation",
    model: route.model,
    metadata: { level: input.level, messageCount: input.messages.length, targetCount: input.targets.length, kind: input.kind },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Evaluate the completed German conversation. For a mission, taskSuccess means the conversational objective was actually achieved, not merely mentioned. Assess grammar, naturalness, vocabulary, and each target lexical unit. Be constructive and concise. Do not treat the score as an official CEFR assessment.",
        },
        { role: "user", content: JSON.stringify(input) },
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
