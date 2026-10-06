import type { TargetLanguage } from "@prisma/client";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { targetLanguageConfig } from "@/lib/languages";

const examplesSchema = z.object({
  examples: z
    .array(
      z.object({
        targetText: z.string(),
        english: z.string(),
        persian: z.string(),
        register: z.enum([
          "neutral",
          "formal",
          "informal",
          "professional",
          "daily",
        ]),
      }),
    )
    .min(3)
    .max(4),
});

export async function generateLexicalExamples(input: {
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  level: string;
  patterns: string[];
  existingExamples: string[];
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const route = aiRoute("lexical_examples");
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "lexical_examples",
    model: route.model,
    metadata: {
      level: input.level,
      existingCount: input.existingExamples.length,
      targetLanguage: language.code,
    },
  });

  try {
    const response = await getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            `Create 3 to 4 distinct, natural ${language.promptName} example sentences using the requested lexical unit. Match the learner's CEFR level and vary context and register. Preserve ${language.promptName}-specific spelling, accents, articles, agreement, and morphology. Put the target-language sentence in targetText. Provide accurate English and Persian translations. Avoid repeating existing examples.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            lemma: input.lemma,
            article: input.article,
            partOfSpeech: input.partOfSpeech,
            level: input.level,
            patterns: input.patterns,
            existingExamples: input.existingExamples,
          }),
        },
      ],
      text: { format: zodTextFormat(examplesSchema, "lexical_examples") },
    });

    if (!response.output_parsed) {
      const error = new Error("OpenAI did not return valid examples.");
      await usageRecorder.failure(error, response);
      throw error;
    }

    await usageRecorder.success(response);
    return response.output_parsed.examples;
  } catch (error) {
    if (
      !(
        error instanceof Error &&
        error.message === "OpenAI did not return valid examples."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
