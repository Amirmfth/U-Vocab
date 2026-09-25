import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

export const writingTaskSchema = z.object({
  title: z.string(),
  task: z.string(),
  checklist: z.array(z.string()).min(2).max(6),
});

export async function generateWritingTask(input: {
  userId: string;
  mode: "GUIDED" | "OPEN";
  level: string;
  taskType: string;
  topic: string;
  targetWords: number;
  targets: Array<{ lemma: string; patterns: string[] }>;
}) {
  const route = aiRoute("writing_task");
  const perf = startOperation("ai.writing_task", {
    model: route.model,
    mode: input.mode,
    level: input.level,
    targetCount: input.targets.length,
  });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "writing_task",
    model: route.model,
    metadata: {
      level: input.level,
      mode: input.mode,
      taskType: input.taskType,
      targetWords: input.targetWords,
      targetCount: input.targets.length,
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
              "Create a realistic German writing-practice task. Match the requested CEFR level, writing type, topic, and approximate word count. Do not claim this is an official exam or official CEFR certification. In GUIDED mode, make the supplied target lexical units naturally useful without requiring awkward use of every item. In OPEN mode, do not prescribe vocabulary. Return a concise title, the task instructions, and a short content checklist.",
          },
          {
            role: "user",
            content: JSON.stringify({ ...input, userId: undefined }),
          },
        ],
        text: { format: zodTextFormat(writingTaskSchema, "writing_task") },
      }),
    );

    if (!response.output_parsed) {
      const parseError = new Error(
        "OpenAI did not return a valid writing task.",
      );
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
    await usageRecorder.failure(error);
    throw error;
  }
}
