import { AI_PROVIDER } from "./client";
import { recordAIUsage, type AIUsageLike } from "./usage";

type SafeMetadataValue = string | number | boolean | null | undefined;
export type SafeAIMetadata = Record<string, SafeMetadataValue>;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function errorCategory(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  if (name.includes("timeout") || message.includes("timeout")) return "timeout";
  if (message.includes("rate") && message.includes("limit")) return "rate_limit";
  if (message.includes("parse") || message.includes("valid")) return "parse";
  if (message.includes("auth") || message.includes("api key")) return "auth";
  return name || "error";
}

export function createAIUsageRecorder(input: {
  userId: string;
  operation: string;
  model: string;
  provider?: string;
  metadata?: SafeAIMetadata;
}) {
  const startedAt = nowMs();
  let recorded = false;

  async function persist(args: {
    status: "SUCCESS" | "ERROR";
    usage?: AIUsageLike | null;
    requestId?: string | null;
    error?: unknown;
    timeToFirstTokenMs?: number | null;
    retryCount?: number | null;
  }) {
    if (recorded) return;
    recorded = true;

    await recordAIUsage({
      userId: input.userId,
      operation: input.operation,
      model: input.model,
      provider: input.provider ?? AI_PROVIDER,
      status: args.status,
      usage: args.usage,
      requestId: args.requestId,
      errorMessage:
        args.error instanceof Error
          ? args.error.message
          : args.error
            ? String(args.error)
            : null,
      errorCategory: args.error ? errorCategory(args.error) : null,
      retryCount: args.retryCount ?? null,
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      timeToFirstTokenMs: args.timeToFirstTokenMs ?? null,
      metadata: input.metadata,
    });
  }

  return {
    success(response: {
      usage?: AIUsageLike | null;
      id?: string | null;
    }) {
      return persist({
        status: "SUCCESS",
        usage: response.usage,
        requestId: response.id,
      });
    },
    failure(
      error: unknown,
      response?: {
        usage?: AIUsageLike | null;
        id?: string | null;
      },
    ) {
      return persist({
        status: "ERROR",
        usage: response?.usage,
        requestId: response?.id,
        error,
      });
    },
    streamingSuccess(input: {
      usage?: AIUsageLike | null;
      requestId?: string | null;
      timeToFirstTokenMs?: number | null;
    }) {
      return persist({
        status: "SUCCESS",
        usage: input.usage,
        requestId: input.requestId,
        timeToFirstTokenMs: input.timeToFirstTokenMs,
      });
    },
  };
}
