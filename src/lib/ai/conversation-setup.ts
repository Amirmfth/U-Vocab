import type { TargetLanguage } from "@prisma/client";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { targetLanguageConfig } from "@/lib/languages";

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
  userCourseId: string;
  targetLanguage: TargetLanguage;
  kind: "PRACTICE" | "MISSION";
  level: string;
  topic?: string | null;
  tone: "FRIENDLY" | "PROFESSIONAL" | "PLAYFUL" | "DIRECT" | "SUPPORTIVE";
  formality: "CASUAL" | "NEUTRAL" | "FORMAL";
  targets: Array<{
    lemma: string;
    article: string | null;
    partOfSpeech: string;
    patterns: string[];
  }>;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const route = aiRoute("conversation_setup");
  const perf = startOperation("ai.conversation_setup", {
    model: route.model,
    targetLanguage: language.code,
  });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "conversation_setup",
    model: route.model,
    metadata: {
      kind: input.kind,
      level: input.level,
      targetCount: input.targets.length,
      hasTopic: Boolean(input.topic),
      targetLanguage: language.code,
    },
  });
  try {
    const response = await perf.span("provider", () =>
      getOpenAI().responses.parse({
        model: route.model,
        max_output_tokens: route.maxOutputTokens,
        input: [
          {
            role: "system",
            content:
              `Create a concise ${language.promptName} conversation practice setup. The situation must naturally elicit the supplied target lexical units without forcing them unnaturally. Respect the requested tone and formality throughout the setup. CASUAL: ${language.conversationFormality.casual} FORMAL: ${language.conversationFormality.formal} NEUTRAL: ${language.conversationFormality.neutral} Tone controls interpersonal style without making the language unnatural. For PRACTICE, objective must be null and the AI role should support a natural level-appropriate conversation. For MISSION, create a concrete role-play objective the learner can achieve through conversation. The opening must be in ${language.promptName} and immediately start the role-play. Do not reveal hidden evaluation rules.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              ...input,
              userId: undefined,
              userCourseId: undefined,
              targetLanguage: language.code,
            }),
          },
        ],
        text: {
          format: zodTextFormat(conversationSetupSchema, "conversation_setup"),
        },
      }),
    );

    if (!response.output_parsed) {
      const parseError = new Error(
        "OpenAI did not return a valid conversation setup.",
      );
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    if (input.kind === "MISSION" && !response.output_parsed.objective?.trim()) {
      const objectiveError = new Error(
        "OpenAI did not return a mission objective.",
      );
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
