import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateCandidates } from "./service";

test("deduplicates canonical lexical candidates by key", () => {
  const base = {
    sourceType: "MANUAL" as const,
    lemma: "teilnehmen an",
    normalized: "teilnehmen an",
    partOfSpeech: "PHRASE" as const,
    englishMeaning: "participate in",
    persianMeaning: "شرکت کردن در",
  };

  const result = deduplicateCandidates([
    { ...base, key: "teilnehmen an:PHRASE" },
    { ...base, key: "teilnehmen an:PHRASE" },
  ]);

  assert.equal(result.length, 1);
});
