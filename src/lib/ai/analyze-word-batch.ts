import type { TargetLanguage } from "@prisma/client";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { lexicalAnalysisSchema, type LexicalAnalysis } from "./schemas";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { targetLanguageConfig } from "@/lib/languages";

export function lexicalBatchSchema(wordCount: number) {
  return z.object(
    Object.fromEntries(
      Array.from({ length: wordCount }, (_, index) => [
        `word_${index}`,
        lexicalAnalysisSchema,
      ]),
    ),
  );
}

export async function analyzeLexemeBatch(input: {
  words: string[];
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
}) {
  if (input.words.length < 1 || input.words.length > 8) {
    throw new Error("Analyze 1–8 words per batch.");
  }
  const language = targetLanguageConfig(input.targetLanguage);
  const route = aiRoute("lexical_batch_analysis");
  const batchSchema = lexicalBatchSchema(input.words.length);
  const perf = startOperation("ai.lexical_batch_analysis", {
    model: route.model,
    wordCount: input.words.length,
    targetLanguage: language.code,
  });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "lexical_batch_analysis",
    model: route.model,
    metadata: {
      wordCount: input.words.length,
      targetLanguage: language.code,
    },
  });
  try {
    const response = await perf.span("provider", () =>
      getOpenAI().responses.parse({
        model: route.model,
        max_output_tokens: route.maxOutputTokens,
        input: [
          {
            role: "system",
            content:
              `Analyze each supplied ${language.promptName} word or phrase independently. Fill every required word_N field, where N is the input index. For each word, identify its canonical lemma and part of speech, usual CEFR level, a concise monolingual target-language definition, natural English and Persian meanings, useful ${language.promptName}-specific grammar/morphology patterns, and one concise example. For English targets, capture phrasal verbs, irregular morphology, countability, verb patterns, and collocations where useful. Preserve meaningful accents and apostrophes. Keep each result concise. Do not omit, merge, or invent input words.`,
          },
          {
            role: "user",
            content: JSON.stringify(
              Object.fromEntries(
                input.words.map((word, index) => [`word_${index}`, word]),
              ),
            ),
          },
        ],
        text: {
          format: zodTextFormat(batchSchema, "lexical_batch_analysis"),
        },
      }),
    );
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("AI did not return a valid word batch.");
    await usageRecorder.success(response);
    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });
    return input.words.map((_, index) => ({
      index,
      analysis: parsed[`word_${index}`] as LexicalAnalysis,
    }));
  } catch (error) {
    perf.fail(error);
    await usageRecorder.failure(error);
    throw error;
  }
}
