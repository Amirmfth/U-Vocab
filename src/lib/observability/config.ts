function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const observabilityConfig = {
  environment:
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development",
  release:
    process.env.NEXT_PUBLIC_APP_RELEASE ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    "development",
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "",
    enabled: Boolean(
      process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
    ) && process.env.NODE_ENV !== "test",
    tracesSampleRate: Math.max(
      0,
      Math.min(1, numberFromEnv(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1)),
    ),
  },
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "",
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    enabled:
      Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PUBLIC_ANALYTICS_DISABLED !== "true",
    replayEnabled:
      process.env.NEXT_PUBLIC_POSTHOG_REPLAY_ENABLED === "true" &&
      process.env.NEXT_PUBLIC_ANALYTICS_DISABLED !== "true",
  },
} as const;

export function analyticsAllowed(input?: { optedOut?: boolean | null }) {
  return observabilityConfig.posthog.enabled && input?.optedOut !== true;
}
