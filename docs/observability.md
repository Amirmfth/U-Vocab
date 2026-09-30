# Observability and product analytics

U-Vocab uses separate systems for separate jobs:

- **Sentry**: production errors, traces, performance regressions, source maps, and release debugging.
- **PostHog**: product behavior, funnels, retention, feature usage, and optional session replay.
- **AiUsageEvent**: authoritative AI token, cost, provider, and usage telemetry in PostgreSQL.
- **startOperation()**: domain-specific operation timings. Its spans are bridged into Sentry when Sentry is enabled.

The integration was aligned with the current Next.js guidance on September 30, 2026: browser initialization lives in `instrumentation-client.ts`, server/edge registration lives in `instrumentation.ts`, and Sentry build integration is applied through `withSentryConfig`.

## Privacy model

Raw learner content is not an analytics property.

The typed product-event boundary permits only bounded primitive metadata and rejects private keys such as:

- draft;
- content;
- conversation/message text;
- prompts/responses;
- answers;
- custom notes;
- email;
- tokens/passwords.

Sentry is initialized with `sendDefaultPii: false`. Its `beforeSend` scrubber:

- keeps only the internal user ID;
- removes request bodies and cookies;
- removes authorization/token/secret fields;
- strips query strings/fragments from request URLs;
- removes breadcrumb messages;
- recursively removes known sensitive keys.

Session replay is disabled by default. When explicitly enabled, all input values and page text are masked conservatively.

## Identity

PostHog distinct IDs are the authenticated internal `User.id`, never email.

The root layout identifies the current user after authentication and attaches:

- internal user ID;
- current course ID;
- plan;
- UI locale;
- target language.

Logout resets PostHog identity before the browser redirects, preventing the next account on a shared browser from inheriting the previous distinct ID.

Sentry receives the same safe identifiers. Release/environment metadata comes from explicit variables or Vercel commit/environment variables.

## Product-event boundary

Feature code should use:

- server: `recordProductEvent(...)`;
- browser: `captureProductEvent(...)`.

Do not import PostHog directly into feature modules.

Server captures are scheduled after the response where Next.js request context permits, so analytics delivery does not block normal navigation.

The taxonomy is defined in `src/lib/analytics/events.ts` and includes onboarding, vocabulary, review, grammar, writing, reading, conversation, and monetization events.

## Sentry error policy

Expected domain outcomes are not fatal exceptions:

- quota exceeded / Pro required;
- authentication-required outcomes;
- normal validation errors;
- ordinary not-found outcomes.

Unexpected infrastructure/provider/database failures remain reportable.

Existing `startOperation()` spans are retained and bridge safe timing metadata to Sentry. Sensitive metadata keys are dropped before span attributes or logs are built.

## Environment variables

### Sentry

```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

The auth token is needed only by the build/deployment environment for source-map/release upload. Use an organization token with the minimum CI/source-map permissions required by Sentry. Never expose it as a `NEXT_PUBLIC_` variable.

### PostHog

```
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_ANALYTICS_DISABLED=false
NEXT_PUBLIC_POSTHOG_REPLAY_ENABLED=false
```

Analytics is disabled automatically outside production and when the project token is absent. `NEXT_PUBLIC_ANALYTICS_DISABLED=true` is the central product-analytics kill switch. Sentry operational telemetry is independent.

### Release/environment

```
NEXT_PUBLIC_APP_ENV=
NEXT_PUBLIC_APP_RELEASE=
GIT_COMMIT_SHA=
```

When these are unset on Vercel, `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` are used.

## Production smoke check

The repository includes an authenticated smoke endpoint that is **off by default**.

1. Configure Sentry and PostHog environment variables in the production/preview deployment.
2. Set `OBSERVABILITY_SMOKE_ENABLED=true` temporarily.
3. Sign in with a test account.
4. Send an authenticated `POST /api/observability/smoke` request from that logged-in browser/session.
5. Confirm the JSON reports `sentryEnabled: true` and `analyticsEnabled: true`.
6. In Sentry, verify an exception named **U-Vocab observability smoke test** appears with the correct release and a mapped application stack/source context.
7. In PostHog, verify `observability_smoke_test` is attached to the test account's internal user ID rather than email.
8. Confirm the Sentry event contains no email, cookies, auth token, query parameters, or learner text.
9. Set `OBSERVABILITY_SMOKE_ENABLED=false` again and redeploy.

For source-map verification, open the smoke event stack in Sentry and confirm frames point to TypeScript/source files rather than minified production bundles. If not, verify `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, and release consistency in the deployment logs.

## Local development

No Sentry or PostHog account is required to run U-Vocab locally. Leave their keys empty and the wrappers become no-ops while the existing internal performance logs and `AiUsageEvent` continue to function.
