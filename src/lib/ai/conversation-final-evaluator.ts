import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";

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
  try {
    const response = await getOpenAI().responses.parse({
      model: AI_MODEL,
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
    });

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "conversation_final_evaluation",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed final conversation evaluation.",
      });
      throw new Error("OpenAI did not return a valid conversation evaluation.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "conversation_final_evaluation",
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
        error.message === "OpenAI did not return a valid conversation evaluation."
      )
    ) {
      await recordAIUsage({
        userId: input.userId,
        operation: "conversation_final_evaluation",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
