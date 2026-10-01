import * as Sentry from "@sentry/nextjs";
import { EntitlementError } from "@/lib/entitlements/errors";
import { observabilityConfig } from "./config";
import { sanitizeTelemetryValue } from "./privacy";

export function isExpectedOperationalError(error: unknown) {
  if (error instanceof EntitlementError) return true;
  if (error instanceof Error && error.name === "UnauthorizedError") return true;
  if (error instanceof Error && error.name === "ZodError") return true;

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("not found") ||
    message.includes("invalid ") ||
    message.includes("choose a valid") ||
    message.includes("is required") ||
    message.includes("too short") ||
    message.includes("too long")
  );
}

export function reportUnexpectedError(
  error: unknown,
  context: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (!observabilityConfig.sentry.enabled || isExpectedOperationalError(error)) {
    return;
  }

  Sentry.withScope((scope) => {
    const safeContext = sanitizeTelemetryValue(context) as Record<string, unknown>;
    for (const [key, value] of Object.entries(safeContext)) {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        scope.setTag(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
