import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

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
  const route = aiRoute("conversation_setup");
  const perf = startOperation("ai.conversation_setup", { model: route.model });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "conversation_setup",
    model: route.model,
    metadata: { kind: input.kind, level: input.level, targetCount: input.targets.length, hasTopic: Boolean(input.topic) },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
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
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid conversation setup.");
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    if (input.kind === "MISSION" && !response.output_parsed.objective?.trim()) {
      const objectiveError = new Error("OpenAI did not return a mission objective.");
      await usageRecorder.failure(objectiveError, response);
      throw objectiveError;
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
        error.message === "OpenAI did not return a valid conversation setup."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
