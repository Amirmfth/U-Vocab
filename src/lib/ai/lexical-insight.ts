import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";
import { startOperation } from "@/lib/performance";

export const lexicalInsightSchema = z.object({
  germanDefinition: z.string(),
  englishExplanation: z.string(),
  persianExplanation: z.string(),
  grammarNotes: z.string(),
  comparisonTarget: z.string().nullable(),
  comparisonNotes: z.string().nullable(),
  examples: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
      persian: z.string(),
      register: z.enum(["neutral", "formal", "informal", "professional", "daily"]),
    }),
  ).min(3).max(6),
});

export type LexicalInsightResult = z.infer<typeof lexicalInsightSchema>;

export async function generateLexicalInsight(input: {
  userId: string;
  lemma: string;
  article?: string | null;
  plural?: string | null;
  partOfSpeech: string;
  patterns: string[];
  level: string;
  compareWith?: string | null;
}) {
  const perf = startOperation("ai.lexical_insight", { model: AI_MODEL });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are U-Vocab's German lexical tutor. Teach usable vocabulary, not flashcards. Keep the German explanation appropriate for the requested CEFR level. Explain grammar and lexical patterns precisely. Produce varied natural examples across contexts/registers. Always provide natural English and Persian explanations/translations. If a comparison target is provided, explain the practical difference between the two German expressions.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: zodTextFormat(lexicalInsightSchema, "lexical_insight"),
      },
    }));

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "lexical_insight",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed lexical insight.",
      });
      throw new Error("OpenAI did not return a valid lexical insight.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "lexical_insight",
      model: AI_MODEL,
      status: "SUCCESS",
      usage: response.usage,
      requestId: response.id,
    });

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });

    return response.output_parsed;
  } catch (error) {
    perf.fail(error);
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid lexical insight.")) {
      await recordAIUsage({
        userId: input.userId,
        operation: "lexical_insight",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
