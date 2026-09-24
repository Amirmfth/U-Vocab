import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";

export const conversationSetupSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  aiRole: z.string(),
  objective: z.string().nullable(),
  opening: z.string(),
});

export type ConversationSetup = z.infer<typeof conversationSetupSchema>;

export async function generateConversationSetup(input: {
  userId: string;
  kind: "PRACTICE" | "MISSION";
  level: string;
  topic?: string | null;
  targets: Array<{
    lemma: string;
    article: string | null;
    partOfSpeech: string;
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
            "Create a concise German conversation practice setup. The situation must naturally elicit the supplied target lexical units without forcing them unnaturally. For PRACTICE, objective must be null and the AI role should support a natural level-appropriate conversation. For MISSION, create a concrete role-play objective the learner can achieve through conversation. The opening must be in German and immediately start the role-play. Do not reveal hidden evaluation rules.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: zodTextFormat(conversationSetupSchema, "conversation_setup"),
      },
    });

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "conversation_setup",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed conversation setup.",
      });
      throw new Error("OpenAI did not return a valid conversation setup.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "conversation_setup",
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
        error.message === "OpenAI did not return a valid conversation setup."
      )
    ) {
      await recordAIUsage({
        userId: input.userId,
        operation: "conversation_setup",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
