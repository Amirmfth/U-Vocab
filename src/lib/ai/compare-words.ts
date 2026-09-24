import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";

export const comparisonSchema = z.object({
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
  try {
    const response = await getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Teach the practical distinction between two commonly confused German lexical units. Be concise but precise. Explain the distinction in level-appropriate German and also in natural English and Persian. Contrast register, meaning, collocation, grammar, and usage only where relevant. Create contrastive examples, short discrimination questions, and one production prompt for each word. Avoid trick questions and accept that close synonyms can overlap.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: {
        format: zodTextFormat(comparisonSchema, "german_word_comparison"),
      },
    });

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "word_comparison",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed word comparison.",
      });
      throw new Error("OpenAI did not return a valid word comparison.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "word_comparison",
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
        error.message === "OpenAI did not return a valid word comparison."
      )
    ) {
      await recordAIUsage({
        userId: input.userId,
        operation: "word_comparison",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
