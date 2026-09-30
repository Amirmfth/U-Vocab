import assert from "node:assert/strict";
import test from "node:test";
import { parseWordList } from "./word-list";

test("parses pasted and uploaded word lists without a count cap", () => {
  assert.deepEqual(parseWordList('Haus,gehen,"sich, erinnern"\nHaus'), ["Haus", "gehen", "sich, erinnern"]);
  assert.equal(parseWordList(Array.from({ length: 50 }, (_, index) => `Wort${index}`).join(",")).length, 50);
});


test("deduplicates German article and casing variants before batch analysis", () => {
  assert.deepEqual(parseWordList("die Gelegenheit,Gelegenheit,gelegenheit"), ["die Gelegenheit"]);
});
