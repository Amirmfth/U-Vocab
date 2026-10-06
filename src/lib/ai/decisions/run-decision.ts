import { z, type ZodType } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "../client";
import { aiRoute, type AIOperation } from "../routing";
import { createAIUsageRecorder, type SafeAIMetadata } from "../usage-recorder";
import { promptVersionFor } from "../prompt-versions";

export async function runStructuredDecision<T>(input: {
  userId: string;
  userCourseId: string;
  operation: Extract<AIOperation, "recommendation_rerank" | "lexical_edge_rerank" | "daily_session_plan">;
  schema: ZodType<T>;
  schemaName: string;
  system: string;
  payload: unknown;
  metadata?: SafeAIMetadata;
}): Promise<
  | { status: "ok"; data: T; model: string; routeReason: string }
  | { status: "fallback"; error: string; model: string; routeReason: string }
> {
  const route = aiRoute(input.operation);
  const recorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: input.operation,
    model: route.model,
    metadata: {
      ...input.metadata,
      routeReason: route.reason,
    },
  });

  try {
    const response = await getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            input.system +
            " Return only the requested structured decision. Do not explain your reasoning. Never invent IDs.",
        },
        { role: "user", content: JSON.stringify(input.payload) },
      ],
      text: { format: zodTextFormat(input.schema, input.schemaName) },
    });

    if (!response.output_parsed) {
      const error = new Error("Decision model returned no valid structured output.");
      await recorder.failure(error, response);
      return {
        status: "fallback",
        error: error.message,
        model: route.model,
        routeReason: route.reason,
      };
    }

    await recorder.success(response);
    return {
      status: "ok",
      data: response.output_parsed as T,
      model: route.model,
      routeReason: route.reason,
    };
  } catch (error) {
    await recorder.failure(error);
    return {
      status: "fallback",
      error: error instanceof Error ? error.message : "Decision request failed.",
      model: route.model,
      routeReason: route.reason,
    };
  }
}

export function decisionPromptVersion(operation: string) {
  return promptVersionFor(operation);
}

export const boundedScoreSchema = z.number().min(0).max(1);
