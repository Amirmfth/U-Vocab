import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

const comparisonBaseSchema = z.object({
  germanDistinction: z.string(),
  englishDistinction: z.string(),
  persianDistinction: z.string(),
  contrasts: z.array(
    z.object({
      label: z.string(),
      left: z.string(),
      right: z.string(),
    }),
  ).min(2).max(5),
  examples: z.array(
    z.object({
      german: z.string(),
      answer: z.enum(["LEFT", "RIGHT"]),
      english: z.string(),
      persian: z.string(),
      explanation: z.string(),
    }),
  ).min(4).max(8),
  discrimination: z.array(
    z.object({
      prompt: z.string(),
      answer: z.enum(["LEFT", "RIGHT"]),
      explanation: z.string(),
    }),
  ).min(3).max(6),
  production: z.object({
    leftPrompt: z.string(),
    rightPrompt: z.string(),
  }),
});

const legacyComparisonSchema = comparisonBaseSchema.extend({
  production: z.array(
    z.object({
      target: z.enum(["LEFT", "RIGHT"]),
      prompt: z.string(),
    }),
  ).length(2),
});

export const comparisonSchema = z.union([
  comparisonBaseSchema,
  legacyComparisonSchema,
]).transform((value) => {
  if (!Array.isArray(value.production)) return value;

  return {
    ...value,
    production: {
      leftPrompt:
        value.production.find((item) => item.target === "LEFT")?.prompt ??
        "Use the first word naturally in a German sentence.",
      rightPrompt:
        value.production.find((item) => item.target === "RIGHT")?.prompt ??
        "Use the second word naturally in a German sentence.",
    },
  };
});

export type ComparisonContent = z.infer<typeof comparisonSchema>;

export async function generateWordComparison(input: {
  userId: string;
  level: string;
  left: {
    lemma: string;
    article: string | null;
    partOfSpeech: string;
    patterns: string[];
    examples: string[];
  };
  right: {
    lemma: string;
    article: string | null;
    partOfSpeech: string;
    patterns: string[];
    examples: string[];
  };
}) {
  const route = aiRoute("word_comparison");
  const perf = startOperation("ai.word_comparison", { model: route.model });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "word_comparison",
    model: route.model,
    metadata: { level: input.level },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Teach the practical distinction between two commonly confused German lexical units. Be concise but precise. Explain the distinction in level-appropriate German and also in natural English and Persian. Contrast register, meaning, collocation, grammar, and usage only where relevant. Create contrastive examples, short discrimination questions, and one production prompt for each word. Avoid trick questions and accept that close synonyms can overlap.",
        },
        { role: "user", content: JSON.stringify({ ...input, userId: undefined }) },
      ],
      text: {
        format: zodTextFormat(comparisonBaseSchema, "german_word_comparison"),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid word comparison.");
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
        error.message === "OpenAI did not return a valid word comparison."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
