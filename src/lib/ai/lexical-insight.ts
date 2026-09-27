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
}) {
  const route = aiRoute("lexical_insight");
  const perf = startOperation("ai.lexical_insight", { model: route.model });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "lexical_insight",
    model: route.model,
    metadata: { level: input.level, patternCount: input.patterns.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "You are a German vocabulary tutor. Return four distinct plain-text fields for the supplied word. germanDefinition: define the word in natural German at the requested CEFR level. englishExplanation: explain its meaning and a useful usage nuance in natural English. persianExplanation: explain the same meaning and nuance in natural Persian (فارسی), using Persian script and punctuation; keep German words in German script. grammarNotes: give only practical grammar or usage rules in English, including relevant supplied patterns. Be concise, avoid repeating the same sentence across fields, and do not include comparisons with other words, headings, Markdown, or invented facts.",
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
