import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { recordAIUsage } from "./usage";

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
  try {
    const response = await getOpenAI().responses.parse({
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
    });

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

    return response.output_parsed;
  } catch (error) {
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
