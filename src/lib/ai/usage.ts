import { db } from "@/lib/db";
import { AI_PROVIDER } from "./client";
import { promptVersionFor } from "./prompt-versions";

type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
};

export async function recordAIUsage(input: {
  userId: string;
  operation: string;
  model: string;
  provider?: string;
  promptVersion?: string;
  status: "SUCCESS" | "ERROR";
  usage?: UsageLike | null;
  requestId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    await db.aiUsageEvent.create({
      data: {
        userId: input.userId,
        operation: input.operation,
        provider: input.provider ?? AI_PROVIDER,
        model: input.model,
        promptVersion:
          input.promptVersion ?? promptVersionFor(input.operation),
        status: input.status,
        inputTokens: input.usage?.input_tokens ?? 0,
        outputTokens: input.usage?.output_tokens ?? 0,
        totalTokens: input.usage?.total_tokens ?? 0,
        requestId: input.requestId ?? null,
        errorMessage: input.errorMessage?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to persist OpenAI usage", error);
  }
}
