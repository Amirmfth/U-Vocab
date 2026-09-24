import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateLexicalItems, lexicalKey } from "./lexical-batch";

test("lexicalKey normalizes German lexical keys consistently", () => {
  assert.equal(lexicalKey("  Haus  ", "NOUN"), "haus:NOUN");
});

test("deduplicateLexicalItems preserves first occurrence and part-of-speech distinctions", () => {
  const items = deduplicateLexicalItems([
    { lemma: "Haus", partOfSpeech: "NOUN", value: 1 },
    { lemma: " haus ", partOfSpeech: "NOUN", value: 2 },
    { lemma: "Haus", partOfSpeech: "VERB", value: 3 },
  ]);

  assert.deepEqual(
    items.map((item) => item.value),
    [1, 3],
  );
});
