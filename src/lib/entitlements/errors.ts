import type { EntitlementFeature, QuotaKey } from "./config";

export type EntitlementErrorCode =
  | "QUOTA_EXCEEDED"
  | "PRO_REQUIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "USAGE_SAFETY_LIMIT";

export class EntitlementError extends Error {
  constructor(
    public readonly code: EntitlementErrorCode,
    message: string,
    public readonly details: Record<string, string | number | boolean | null> = {},
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export class QuotaExceededError extends EntitlementError {
  constructor(
    key: QuotaKey,
    limit: number,
    used: number,
    resetAt: Date,
  ) {
    super("QUOTA_EXCEEDED", "This allowance has been reached.", {
      key,
      limit,
      used,
      resetAt: resetAt.toISOString(),
    });
  }
}

export class ProRequiredError extends EntitlementError {
  constructor(feature: EntitlementFeature) {
    super("PRO_REQUIRED", "This feature requires Pro.", { feature });
  }
}

export function entitlementErrorMessage(error: unknown) {
  if (!(error instanceof EntitlementError)) return null;
  return error.code === "QUOTA_EXCEEDED"
    ? "You have reached this plan allowance."
    : error.code === "PRO_REQUIRED"
      ? "This feature requires Pro."
      : error.code === "USAGE_SAFETY_LIMIT"
        ? "This action is temporarily unavailable."
        : "Your subscription is not active.";
}
