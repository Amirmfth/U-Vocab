import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizePerformanceMetadata,
  startOperation,
} from "./performance";

test("sanitizePerformanceMetadata removes user-content keys", () => {
  assert.deepEqual(
    sanitizePerformanceMetadata({
      operationKind: "writing",
      draft: "private draft",
      message: "private message",
      inputChars: 240,
      success: true,
    }),
    {
      operationKind: "writing",
      inputChars: 240,
      success: true,
    },
  );
});

test("startOperation records success once", async () => {
  const originalInfo = console.info;
  const logs: string[] = [];
  console.info = (value?: unknown) => {
    logs.push(String(value));
  };

  try {
    const operation = startOperation("test.operation", { count: 2 });
    await operation.span("work", async () => {
      await Promise.resolve();
    });
    operation.success({ resultCount: 1 });
    operation.success({ resultCount: 2 });

    assert.equal(logs.length, 1);
    const parsed = JSON.parse(logs[0]) as {
      event: string;
      operation: string;
      status: string;
      durationMs: number;
      spans: Record<string, number>;
      metadata: Record<string, unknown>;
    };
    assert.equal(parsed.event, "u_vocab.performance");
    assert.equal(parsed.operation, "test.operation");
    assert.equal(parsed.status, "success");
    assert.equal(typeof parsed.durationMs, "number");
    assert.equal(typeof parsed.spans.work, "number");
    assert.equal(parsed.metadata.resultCount, 1);
  } finally {
    console.info = originalInfo;
  }
});
