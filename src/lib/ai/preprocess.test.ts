import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReadingExcerpt,
  detectLexemePresence,
  detectRepeatedWords,
  rankReadingCandidates,
} from "./preprocess";

test("detectLexemePresence matches lexical units on normalized boundaries", () => {
  assert.deepEqual(
    detectLexemePresence(
      "Ich möchte heute an dem Kurs teilnehmen.",
      ["teilnehmen", "Teil", "Kurs"],
    ),
    ["teilnehmen", "Kurs"],
  );
});

test("detectRepeatedWords ignores common German stopwords", () => {
  const result = detectRepeatedWords(
    "Das Projekt ist wichtig. Das Projekt bleibt wichtig, weil das Projekt wirklich wichtig ist.",
    3,
  );
  assert.deepEqual(result[0], { word: "projekt", count: 3 });
});

test("rankReadingCandidates removes known vocabulary and caps results", () => {
  const result = rankReadingCandidates(
    "Reise Reise Bahnhof Bahnhof Verspätung Fahrkarte Fahrkarte Zug",
    new Set(["reise", "zug"]),
    2,
  );
  assert.equal(result.length, 2);
  assert.equal(result.some((item) => item.token === "reise"), false);
  assert.equal(result[0].token, "fahrkarte");
});

test("buildReadingExcerpt keeps long input within the configured budget", () => {
  const text =
    "Unwichtiger Satz. " +
    "Der Bahnhof hat heute eine Verspätung. ".repeat(800);
  const excerpt = buildReadingExcerpt(
    text,
    [{ token: "verspätung" }],
    1200,
  );
  assert.ok(excerpt.length <= 1200);
  assert.match(excerpt, /Verspätung/u);
});
