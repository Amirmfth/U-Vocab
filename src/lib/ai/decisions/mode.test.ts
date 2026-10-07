import assert from "node:assert/strict";
import test from "node:test";
import { decisionRolloutMode, shouldRunNativeDecision, shouldUseNativeDecision } from "./mode";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("operation mode supports off shadow and on", () => {
  withEnv(
    {
      OPENAI_DECISIONS_ENABLED: undefined,
      TEST_DECISIONS_MODE: "shadow",
    },
    () => {
      const mode = decisionRolloutMode("TEST_DECISIONS_MODE");
      assert.equal(mode, "shadow");
      assert.equal(shouldRunNativeDecision(mode), true);
      assert.equal(shouldUseNativeDecision(mode), false);
    },
  );
});

test("global kill switch forces decisions off", () => {
  withEnv(
    {
      OPENAI_DECISIONS_ENABLED: "false",
      TEST_DECISIONS_MODE: "on",
    },
    () => assert.equal(decisionRolloutMode("TEST_DECISIONS_MODE"), "off"),
  );
});

test("global enable defaults unspecified operations to on", () => {
  withEnv(
    {
      OPENAI_DECISIONS_ENABLED: "true",
      TEST_DECISIONS_MODE: undefined,
    },
    () => assert.equal(decisionRolloutMode("TEST_DECISIONS_MODE"), "on"),
  );
});
