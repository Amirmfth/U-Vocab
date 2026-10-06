import type { TargetLanguage } from "@prisma/client";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { lexicalAnalysisSchema } from "./schemas";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { targetLanguageConfig } from "@/lib/languages";

export async function analyzeLexeme(input: {
  text: string;
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const route = aiRoute("lexical_analysis");
  const perf = startOperation("ai.lexical_analysis", {
    model: route.model,
    inputChars: input.text.length,
    targetLanguage: language.code,
  });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "lexical_analysis",
    model: route.model,
    metadata: {
      inputChars: input.text.length,
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
              `You analyze ${language.promptName} lexical units for U-Vocab. Prefer complete usable lexical patterns, collocations, morphology, and governed prepositions over isolated translations. Respect ${language.promptName}-specific grammar rather than importing rules from another language. For nouns, return the natural dictionary article/gender information where useful. Preserve meaningful accents and apostrophes. Return natural English and Persian meanings. Assign the lexical unit's usual CEFR level (A1 through C2).`,
          },
          { role: "user", content: input.text },
        ],
        text: {
          format: zodTextFormat(lexicalAnalysisSchema, "lexical_analysis"),
        },
      }),
    );

    if (!response.output_parsed) {
      const parseError = new Error(
        "OpenAI did not return a valid lexical analysis.",
      );
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
        error.message === "OpenAI did not return a valid lexical analysis."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
