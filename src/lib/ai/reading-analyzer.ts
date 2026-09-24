import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
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
      englishMeaning: z.string(),
      persianMeaning: z.string(),
      pattern: z.string().nullable(),
      patternExplanation: z.string().nullable(),
      example: z.string().nullable(),
      occurrences: z.number().int().min(1),
      importance: z.number().int().min(1).max(5),
    }),
  ).min(1).max(120),
});

export type ReadingAnalysis = z.infer<typeof readingAnalysisSchema>;

export async function analyzeReadingText(input: {
  userId: string;
  text: string;
  targetLevel: string;
}) {
  const perf = startOperation("ai.reading_analysis", { model: AI_MODEL, inputChars: input.text.length, targetLevel: input.targetLevel });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "reading_analysis",
    model: AI_MODEL,
    metadata: { inputChars: input.text.length, targetLevel: input.targetLevel, lengthBucket: input.text.length < 2000 ? "short" : input.text.length < 8000 ? "medium" : "long" },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Analyze German reading text into useful lexical units for a vocabulary learner. Prefer multi-word phrases, verb-preposition patterns, collocations, separable/reflexive constructions, and meaningful lemmas over naive token-by-token extraction. Keep surfaceText exactly as a representative form from the submitted text and return every distinct observed inflected/conjugated spelling in surfaceForms. Provide concise English and Persian meanings plus one useful grammatical pattern when relevant. Deduplicate lexical units and report occurrence counts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            targetLevel: input.targetLevel,
            text: input.text,
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
