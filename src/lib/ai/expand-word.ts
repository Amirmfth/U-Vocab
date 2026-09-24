import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";
import { getGenerationCache, putGenerationCache } from "./generation-cache";

export const expansionSchema = z.object({
  suggestions: z.array(
    z.object({
      lemma: z.string(),
      partOfSpeech: z.enum([
        "NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION",
        "CONJUNCTION","INTERJECTION","PHRASE","OTHER",
      ]),
      article: z.string().nullable(),
      plural: z.string().nullable(),
      englishMeaning: z.string(),
      persianMeaning: z.string(),
      relationType: z.enum([
        "WORD_FAMILY","SYNONYM","ANTONYM","DERIVED","RELATED","COLLOCATION","PHRASE",
      ]),
      rationale: z.string(),
      usefulness: z.number().int().min(1).max(5),
    }),
  ).min(4).max(12),
});

export type ExpansionResult = z.infer<typeof expansionSchema>;

export async function generateWordExpansion(input: {
  userId: string;
  lemma: string;
  partOfSpeech: string;
  patterns: string[];
  level: string;
  refresh?: boolean;
}) {
  const route = aiRoute("word_expansion");
  const perf = startOperation("ai.word_expansion", { model: route.model });
  const source = {
    lemma: input.lemma,
    partOfSpeech: input.partOfSpeech,
    patterns: [...input.patterns].sort(),
  };
  const dimensions = {
    level: input.level,
    lemma: input.lemma.toLocaleLowerCase("de-DE"),
    partOfSpeech: input.partOfSpeech,
  };
  const cached = input.refresh
    ? null
    : await getGenerationCache<unknown>({
        operation: "word_expansion",
        dimensions,
        source,
        schemaVersion: "v2",
      });
  const parsedCached = expansionSchema.safeParse(cached);
  if (parsedCached.success) {
    perf.success({ cacheHit: true });
    return parsedCached.data;
  }
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "word_expansion",
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
            "Expand a German lexical unit into useful high-value related vocabulary. Prefer common derivations, word-family members, collocations, phrases, and practical semantic neighbors. Avoid obscure compounds. Return English and Persian meanings. Rank usefulness from 1 to 5.",
        },
        { role: "user", content: JSON.stringify({ ...input, userId: undefined, refresh: undefined }) },
      ],
      text: { format: zodTextFormat(expansionSchema, "word_expansion") },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid word expansion.");
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    await usageRecorder.success(response);
    await putGenerationCache({
      operation: "word_expansion",
      dimensions,
      source,
      schemaVersion: "v2",
      payload: response.output_parsed,
    });

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });

    return response.output_parsed;
  } catch (error) {
    perf.fail(error);
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid word expansion.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
