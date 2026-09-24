import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
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
  const route = aiRoute("lexical_insight");
  const perf = startOperation("ai.lexical_insight", { model: route.model });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "lexical_insight",
    model: route.model,
    metadata: { level: input.level, patternCount: input.patterns.length, hasComparison: Boolean(input.compareWith) },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "You are U-Vocab's German lexical tutor. Teach usable vocabulary, not flashcards. Keep the German explanation appropriate for the requested CEFR level. Explain grammar and lexical patterns precisely. Produce varied natural examples across contexts/registers. Always provide natural English and Persian explanations/translations. If a comparison target is provided, explain the practical difference between the two German expressions.",
        },
        {
          role: "user",
          content: JSON.stringify({ ...input, userId: undefined }),
        },
      ],
      text: {
        format: zodTextFormat(lexicalInsightSchema, "lexical_insight"),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid lexical insight.");
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
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid lexical insight.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
