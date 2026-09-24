import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";

export const topicPackSchema = z.object({
  title: z.string(),
  description: z.string(),
  items: z.array(
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
      rationale: z.string(),
      usefulness: z.number().int().min(1).max(5),
    }),
  ).min(4).max(30),
});

export async function generateTopicPack(input: {
  userId: string;
  topic: string;
  level: string;
  size: number;
}) {
  try {
    const response = await getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Create a focused German vocabulary pack for a real-life topic. Prefer useful lexical units, phrases, collocations, and verb patterns over isolated dictionary words. Match the requested CEFR level. Include natural English and Persian meanings. Avoid obscure vocabulary.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: { format: zodTextFormat(topicPackSchema, "topic_pack") },
    });

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "topic_pack_generation",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed topic pack.",
      });
      throw new Error("OpenAI did not return a valid topic pack.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "topic_pack_generation",
      model: AI_MODEL,
      status: "SUCCESS",
      usage: response.usage,
      requestId: response.id,
    });

    return {
      ...response.output_parsed,
      items: response.output_parsed.items.slice(0, input.size),
    };
  } catch (error) {
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid topic pack.")) {
      await recordAIUsage({
        userId: input.userId,
        operation: "topic_pack_generation",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
