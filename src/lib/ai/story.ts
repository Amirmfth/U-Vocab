import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

export const storySchema = z.object({
  title: z.string(),
  content: z.string(),
  englishSummary: z.string(),
  persianSummary: z.string(),
  usedTargets: z.array(z.string()),
  questions: z
    .array(
      z.object({
        type: z.enum(["COMPREHENSION", "VOCABULARY"]),
        question: z.string(),
        answer: z.string(),
      }),
    )
    .min(4)
    .max(10),
});

export async function generateStory(input: {
  userId: string;
  level: string;
  length: "SHORT" | "MEDIUM" | "LONG";
  topic?: string | null;
  minimumTargetCount: number;
  selectedTargets: Array<{ lemma: string; pattern?: string | null }>;
  candidateTargets: Array<{ lemma: string; pattern?: string | null }>;
}) {
  const route = aiRoute("story_generation");
  const perf = startOperation("ai.story_generation", { model: route.model });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "story_generation",
    model: route.model,
    metadata: {
      level: input.level,
      length: input.length,
      selectedTargetCount: input.selectedTargets.length,
      candidateTargetCount: input.candidateTargets.length,
      minimumTargetCount: input.minimumTargetCount,
      hasTopic: Boolean(input.topic),
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
              "Write compelling, natural German reading material for a vocabulary learner. Every selectedTargets item is mandatory: use it naturally. Choose additional items from candidateTargets so the story uses at least minimumTargetCount lexical units in total. Do not use candidate words as targets unless you choose them. Avoid keyword stuffing, match the requested CEFR level and length, and include comprehension and vocabulary questions. Return exact lemmas for all selected and chosen target words that actually appear in the story.",
          },
          {
            role: "user",
            content: JSON.stringify({ ...input, userId: undefined }),
          },
        ],
        text: { format: zodTextFormat(storySchema, "vocabulary_story") },
      }),
    );

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid story.");
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
    if (
      !(
        error instanceof Error &&
        error.message === "OpenAI did not return a valid story."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
