type MetadataValue = string | number | boolean | null | undefined;
export type PerformanceMetadata = Record<string, MetadataValue>;

type PerformanceStatus = "success" | "error";

const SENSITIVE_METADATA_KEYS = new Set([
  "answer",
  "content",
  "draft",
  "instructions",
  "message",
  "prompt",
  "response",
]);

function clockNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function roundMs(value: number) {
  return Math.round(value * 10) / 10;
}

export function sanitizePerformanceMetadata(
  metadata: PerformanceMetadata = {},
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => {
        if (value === undefined) return false;
        return !SENSITIVE_METADATA_KEYS.has(key.toLowerCase());
      })
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.slice(0, 160) : value ?? null,
      ]),
  );
}

export function startOperation(
  operation: string,
  metadata: PerformanceMetadata = {},
) {
  const startedAt = clockNow();
  const spans: Record<string, number> = {};
  const requestId = crypto.randomUUID();
  let finished = false;

  async function span<T>(name: string, work: () => Promise<T>): Promise<T> {
    const spanStartedAt = clockNow();
    try {
      return await work();
    } finally {
      spans[name] = roundMs((spans[name] ?? 0) + clockNow() - spanStartedAt);
    }
  }

  function finish(
    status: PerformanceStatus,
    extraMetadata: PerformanceMetadata = {},
    error?: unknown,
  ) {
    if (finished) return;
    finished = true;

    const payload = {
      event: "u_vocab.performance",
      operation,
      requestId,
      status,
      durationMs: roundMs(clockNow() - startedAt),
      spans,
      metadata: sanitizePerformanceMetadata({
        ...metadata,
        ...extraMetadata,
      }),
      ...(status === "error"
        ? {
            errorType:
              error instanceof Error
                ? error.name
                : typeof error === "string"
                  ? "Error"
                  : "UnknownError",
          }
        : {}),
    };

    const serialized = JSON.stringify(payload);
    if (status === "error") {
      console.error(serialized);
    } else {
      console.info(serialized);
    }
  }

  return {
    requestId,
    span,
    success(extraMetadata?: PerformanceMetadata) {
      finish("success", extraMetadata);
    },
    fail(error: unknown, extraMetadata?: PerformanceMetadata) {
      finish("error", extraMetadata, error);
    },
  };
}

export type OperationTimer = ReturnType<typeof startOperation>;

export async function instrumentOperation<T>(
  operation: string,
  metadata: PerformanceMetadata,
  work: (timer: OperationTimer) => Promise<T>,
): Promise<T> {
  const timer = startOperation(operation, metadata);
  try {
    const result = await work(timer);
    timer.success();
    return result;
  } catch (error) {
    timer.fail(error);
    throw error;
  }
}
