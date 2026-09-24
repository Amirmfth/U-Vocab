import assert from "node:assert/strict";
import test from "node:test";
import { generationFingerprint } from "./generation-cache";

test("generation fingerprint is stable for the same source", () => {
  const source = { lemma: "abhängen", patterns: ["von + Dativ"] };
  assert.equal(
    generationFingerprint(source),
    generationFingerprint(source),
  );
});

test("generation fingerprint changes when lexical source changes", () => {
  assert.notEqual(
    generationFingerprint({ lemma: "abhängen", patterns: ["von + Dativ"] }),
    generationFingerprint({ lemma: "abhängen", patterns: ["von + Akkusativ"] }),
  );
});
