import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";

const examplesSchema = z.object({
  examples: z.array(z.object({
    german: z.string(),
    english: z.string(),
    persian: z.string(),
    register: z.enum(["neutral", "formal", "informal", "professional", "daily"]),
  })).min(3).max(4),
});

export async function generateLexicalExamples(input: {
  userId: string;
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  level: string;
  patterns: string[];
  existingExamples: string[];
}) {
  const route = aiRoute("lexical_examples");
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "lexical_examples",
    model: route.model,
    metadata: { level: input.level, existingCount: input.existingExamples.length },
  });

  try {
    const response = await getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content: "Create 3 to 4 distinct, natural German example sentences using the requested word. Match the learner's CEFR level and vary context and register. Provide accurate English and Persian translations. Avoid repeating existing examples.",
        },
        {
          role: "user",
          content: JSON.stringify({ ...input, userId: undefined }),
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
    if (!(error instanceof Error && error.message === "OpenAI did not return valid examples.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
