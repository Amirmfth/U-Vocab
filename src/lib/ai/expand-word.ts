import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";
import { startOperation } from "@/lib/performance";

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
}) {
  const perf = startOperation("ai.word_expansion", { model: AI_MODEL });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Expand a German lexical unit into useful high-value related vocabulary. Prefer common derivations, word-family members, collocations, phrases, and practical semantic neighbors. Avoid obscure compounds. Return English and Persian meanings. Rank usefulness from 1 to 5.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: { format: zodTextFormat(expansionSchema, "word_expansion") },
    }));

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "word_expansion",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed word expansion.",
      });
      throw new Error("OpenAI did not return a valid word expansion.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "word_expansion",
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
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid word expansion.")) {
      await recordAIUsage({
        userId: input.userId,
        operation: "word_expansion",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
