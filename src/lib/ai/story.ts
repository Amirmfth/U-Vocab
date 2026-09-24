import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";
import { startOperation } from "@/lib/performance";

export const storySchema = z.object({
  title: z.string(),
  content: z.string(),
  englishSummary: z.string(),
  persianSummary: z.string(),
  usedTargets: z.array(z.string()),
  questions: z.array(
    z.object({
      type: z.enum(["COMPREHENSION", "VOCABULARY"]),
      question: z.string(),
      answer: z.string(),
    }),
  ).min(4).max(10),
});

export async function generateStory(input: {
  userId: string;
  level: string;
  length: "SHORT" | "MEDIUM" | "LONG";
  topic?: string | null;
  targets: Array<{ lemma: string; pattern?: string | null }>;
}) {
  const perf = startOperation("ai.story_generation", { model: AI_MODEL });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Write compelling, natural German reading material for a vocabulary learner. Use the target lexical units naturally and avoid keyword stuffing. Match the requested CEFR level and length. Include comprehension and vocabulary questions. Return exact target lemmas that actually appear in the story.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: { format: zodTextFormat(storySchema, "vocabulary_story") },
    }));

    if (!response.output_parsed) {
      await recordAIUsage({
        userId: input.userId,
        operation: "story_generation",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed story.",
      });
      throw new Error("OpenAI did not return a valid story.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "story_generation",
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
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid story.")) {
      await recordAIUsage({
        userId: input.userId,
        operation: "story_generation",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
