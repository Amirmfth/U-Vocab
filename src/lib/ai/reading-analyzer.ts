import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

export const readingAnalysisSchema = z.object({
  title: z.string().nullable(),
  estimatedLevel: z.string().nullable(),
  lexicalUnits: z.array(
    z.object({
      surfaceText: z.string(),
      surfaceForms: z.array(z.string()).min(1).max(12),
      lemma: z.string(),
      partOfSpeech: z.enum([
        "NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION",
        "CONJUNCTION","INTERJECTION","PHRASE","OTHER",
      ]),
      article: z.string().nullable(),
      plural: z.string().nullable(),
      cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
      englishMeaning: z.string(),
      persianMeaning: z.string(),
      pattern: z.string().nullable(),
      patternExplanation: z.string().nullable(),
      example: z.string().nullable(),
      occurrences: z.number().int().min(1),
      importance: z.number().int().min(1).max(5),
    }),
  ).min(1).max(30),
});

export type ReadingAnalysis = z.infer<typeof readingAnalysisSchema>;

export async function analyzeReadingText(input: {
  userId: string;
  text: string;
  originalTextChars: number;
  candidates: Array<{ token: string; count: number }>;
  targetLevel: string;
}) {
  const route = aiRoute("reading_analysis");
  const perf = startOperation("ai.reading_analysis", { model: route.model, inputChars: input.text.length, targetLevel: input.targetLevel });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "reading_analysis",
    model: route.model,
    metadata: { inputChars: input.text.length, originalTextChars: input.originalTextChars, candidateCount: input.candidates.length, targetLevel: input.targetLevel, lengthBucket: input.originalTextChars < 2000 ? "short" : input.originalTextChars < 8000 ? "medium" : "long" },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "Analyze this bounded German excerpt for high-value lexical learning. The candidate list was ranked deterministically after removing the learner's known vocabulary. Prefer useful phrases, collocations, idioms, verb-preposition patterns, separable/reflexive constructions, and meaningful lemmas; do not turn every token into an item. Return at most 30 lexical units. Use exact observed surface forms from the excerpt, concise English/Persian meanings, at most one useful grammar pattern, and each lexical unit's usual CEFR level (A1 through C2).",
        },
        {
          role: "user",
          content: JSON.stringify({
            targetLevel: input.targetLevel,
            candidates: input.candidates,
            excerpt: input.text,
          }),
        },
      ],
      text: {
        format: zodTextFormat(readingAnalysisSchema, "reading_analysis"),
      },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid reading analysis.");
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
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid reading analysis.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
