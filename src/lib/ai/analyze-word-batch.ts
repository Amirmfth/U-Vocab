import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { lexicalAnalysisSchema, type LexicalAnalysis } from "./schemas";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

export function lexicalBatchSchema(wordCount: number) {
  return z.object(Object.fromEntries(
    Array.from({ length: wordCount }, (_, index) => [`word_${index}`, lexicalAnalysisSchema]),
  ));
}

export async function analyzeGermanLexemeBatch(words: string[], userId: string) {
  if (words.length < 1 || words.length > 8) throw new Error("Analyze 1–8 words per batch.");
  const route = aiRoute("lexical_batch_analysis");
  const batchSchema = lexicalBatchSchema(words.length);
  const perf = startOperation("ai.lexical_batch_analysis", { model: route.model, wordCount: words.length });
  const usageRecorder = createAIUsageRecorder({
    userId,
    operation: "lexical_batch_analysis",
    model: route.model,
    metadata: { wordCount: words.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content: "Analyze each supplied German word or phrase independently. Fill every required word_N field, where N is the input index. For each word, identify its lemma and part of speech, usual CEFR level, natural English and Persian meanings, useful grammar patterns, and one concise example. Keep each result concise. Do not omit, merge, or invent input words.",
        },
        { role: "user", content: JSON.stringify(Object.fromEntries(words.map((word, index) => [`word_${index}`, word]))) },
      ],
      text: { format: zodTextFormat(batchSchema, "lexical_batch_analysis") },
    }));
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("AI did not return a valid word batch.");
    await usageRecorder.success(response);
    perf.success({ requestId: response.id, inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 });
    return words.map((_, index) => ({
      index,
      analysis: parsed[`word_${index}`] as LexicalAnalysis,
    }));
  } catch (error) {
    perf.fail(error);
    await usageRecorder.failure(error);
    throw error;
  }
}
