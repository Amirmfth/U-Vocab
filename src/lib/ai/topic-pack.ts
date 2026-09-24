import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

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
  const perf = startOperation("ai.topic_pack_generation", { model: AI_MODEL });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "topic_pack_generation",
    model: AI_MODEL,
    metadata: { level: input.level, requestedSize: input.size, topicChars: input.topic.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
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
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid topic pack.");
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    await usageRecorder.success(response);

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      requestedSize: input.size,
    });

    return {
      ...response.output_parsed,
      items: response.output_parsed.items.slice(0, input.size),
    };
  } catch (error) {
    perf.fail(error);
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid topic pack.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
