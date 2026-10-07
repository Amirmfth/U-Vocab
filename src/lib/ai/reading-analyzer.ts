import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";
import { filterReadingCandidatesWithDecisions } from "./decisions/reading-filter";
import {
  decisionRolloutMode,
  shouldRunNativeDecision,
  shouldUseNativeDecision,
} from "./decisions/mode";

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
      targetDefinition: z.string(),
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
  userCourseId: string;
  targetLanguage: TargetLanguage;
  text: string;
  originalTextChars: number;
  candidates: Array<{ token: string; count: number }>;
  targetLevel: string;
}) {
  const language = targetLanguageConfig(input.targetLanguage);
  const mode = decisionRolloutMode("OPENAI_DECISIONS_READING_FILTER_MODE", false);
  let candidates = input.candidates;
  if (shouldRunNativeDecision(mode)) {
    const filtered = await filterReadingCandidatesWithDecisions({
      userId: input.userId,
      userCourseId: input.userCourseId,
      targetLanguageCode: language.code,
      targetLevel: input.targetLevel,
      excerpt: input.text,
      candidates: input.candidates,
    });
    if (shouldUseNativeDecision(mode) && filtered.status === "ok") {
      candidates = filtered.candidates;
    }
  }
  const route = aiRoute("reading_analysis");
  const perf = startOperation("ai.reading_analysis", { model: route.model, inputChars: input.text.length, targetLevel: input.targetLevel, targetLanguage: language.code });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "reading_analysis",
    model: route.model,
    metadata: { inputChars: input.text.length, originalTextChars: input.originalTextChars, candidateCount: candidates.length, originalCandidateCount: input.candidates.length, targetLevel: input.targetLevel, targetLanguage: language.code, lengthBucket: input.originalTextChars < 2000 ? "short" : input.originalTextChars < 8000 ? "medium" : "long" },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            `Analyze this bounded ${language.promptName} excerpt for high-value lexical learning. The candidate list was ranked deterministically after removing the learner's known vocabulary. Prefer useful phrases, collocations, idioms, governed-preposition patterns, morphology, and meaningful lemmas that are natural for ${language.promptName}; do not turn every token into an item. Do not import German-specific case, separable-verb, or noun-article assumptions into another language. Return at most 30 lexical units. Use exact observed surface forms from the excerpt, preserve meaningful accents and apostrophes, return a concise monolingual target-language definition plus concise English/Persian meanings, at most one useful grammar pattern, and each lexical unit's usual CEFR level (A1 through C2).`,
        },
        {
          role: "user",
          content: JSON.stringify({
            targetLevel: input.targetLevel,
            candidates,
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
