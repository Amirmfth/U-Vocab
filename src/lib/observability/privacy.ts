const PRIVATE_KEYS = new Set([
  "answer",
  "authorization",
  "content",
  "conversation",
  "cookie",
  "draft",
  "email",
  "instructions",
  "message",
  "notes",
  "password",
  "prompt",
  "response",
  "text",
  "token",
]);

function isPrivateKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    PRIVATE_KEYS.has(normalized) ||
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("authorization") ||
    normalized.includes("cookie")
  );
}

export function sanitizeTelemetryValue(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 4) return "[truncated]";

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeTelemetryValue(item, depth + 1));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(input)
        .filter(([key]) => !isPrivateKey(key))
        .slice(0, 50)
        .map(([key, item]) => [key, sanitizeTelemetryValue(item, depth + 1)]),
    );
  }

  if (typeof value === "string") return value.slice(0, 160);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }
  return String(value).slice(0, 160);
}

export function scrubSentryEvent<T extends {
  user?: Record<string, unknown> | null;
  request?: { data?: unknown; cookies?: unknown; headers?: unknown } | null;
  contexts?: Record<string, unknown> | null;
  extra?: Record<string, unknown> | null;
  breadcrumbs?: Array<{ data?: Record<string, unknown>; message?: string }> | null;
}>(event: T): T {
  if (event.user) {
    event.user = {
      ...(event.user.id ? { id: event.user.id } : {}),
    };
  }

  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers && typeof event.request.headers === "object") {
      event.request.headers = sanitizeTelemetryValue(
        event.request.headers,
      ) as Record<string, unknown>;
    }
  }

  if (event.extra) {
    event.extra = sanitizeTelemetryValue(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = sanitizeTelemetryValue(event.contexts) as Record<string, unknown>;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      message: breadcrumb.message?.slice(0, 160),
      data: breadcrumb.data
        ? (sanitizeTelemetryValue(breadcrumb.data) as Record<string, unknown>)
        : undefined,
    }));
  }

  return event;
}
