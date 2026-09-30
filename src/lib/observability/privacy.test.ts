import assert from "node:assert/strict";
import test from "node:test";
import { scrubSentryEvent, sanitizeTelemetryValue } from "./privacy";

test("generic telemetry sanitizer drops sensitive keys recursively", () => {
  assert.deepEqual(
    sanitizeTelemetryValue({
      level: "B2",
      prompt: "private learner prompt",
      nested: {
        targetCount: 3,
        token: "secret",
      },
    }),
    {
      level: "B2",
      nested: {
        targetCount: 3,
      },
    },
  );
});

test("Sentry scrubber keeps only stable user id and removes request payload/query", () => {
  const event = scrubSentryEvent({
    user: {
      id: "user_123",
      email: "private@example.com",
      username: "private",
    },
    request: {
      url: "https://uvocab.ir/reset-password?token=super-secret",
      data: { draft: "learner writing" },
      cookies: { session: "secret" },
      headers: {
        authorization: "Bearer secret",
        "user-agent": "test",
      },
    },
    extra: {
      content: "conversation text",
      operation: "writing.evaluate",
    },
    contexts: {
      safe: { level: "B2" },
      unsafe: { message: "private" },
    },
    breadcrumbs: [
      {
        message: "learner typed something",
        data: { route: "/writing", prompt: "private" },
      },
    ],
  });

  assert.deepEqual(event.user, { id: "user_123" });
  assert.equal(event.request?.url, "https://uvocab.ir/reset-password");
  assert.equal(event.request?.data, undefined);
  assert.equal(event.request?.cookies, undefined);
  assert.deepEqual(event.request?.headers, { "user-agent": "test" });
  assert.deepEqual(event.extra, { operation: "writing.evaluate" });
  assert.deepEqual(event.contexts, {
    safe: { level: "B2" },
    unsafe: {},
  });
  assert.equal(event.breadcrumbs?.[0]?.message, undefined);
  assert.deepEqual(event.breadcrumbs?.[0]?.data, { route: "/writing" });
});
