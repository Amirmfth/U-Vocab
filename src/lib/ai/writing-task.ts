import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";
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
  const perf = startOperation("ai.writing_task", { model: AI_MODEL, mode: input.mode, level: input.level, targetCount: input.targets.length });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Create a realistic German writing-practice task. Match the requested CEFR level, writing type, topic, and approximate word count. Do not claim this is an official exam or official CEFR certification. In GUIDED mode, make the supplied target lexical units naturally useful without requiring awkward use of every item. In OPEN mode, do not prescribe vocabulary. Return a concise title, the task instructions, and a short content checklist.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: { format: zodTextFormat(writingTaskSchema, "writing_task") },
    }));

    if (!response.output_parsed) {
      throw new Error("OpenAI did not return a valid writing task.");
    }

    await recordAIUsage({
      userId: input.userId,
      operation: "writing_task",
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
    await recordAIUsage({
      userId: input.userId,
      operation: "writing_task",
      model: AI_MODEL,
      status: "ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
    });
    throw error;
  }
}
