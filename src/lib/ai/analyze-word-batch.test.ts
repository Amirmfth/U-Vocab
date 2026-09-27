import assert from "node:assert/strict";
import test from "node:test";
import { zodTextFormat } from "openai/helpers/zod";
import { lexicalBatchSchema } from "./analyze-word-batch";

const analysis = {
  lemma: "Haus",
  partOfSpeech: "NOUN",
  article: "das",
  gender: "neuter",
  plural: "Häuser",
  cefrLevel: "A1",
  englishMeanings: ["house"],
  persianMeanings: ["خانه"],
  patterns: [],
  examples: [{ german: "Das Haus ist groß.", english: "The house is big.", persian: "خانه بزرگ است." }],
};

test("batch analysis requires a result for every input word", () => {
  const schema = lexicalBatchSchema(2);
  assert.equal(schema.safeParse({ word_0: analysis }).success, false);
  assert.equal(schema.safeParse({ word_0: analysis, word_1: analysis }).success, true);
  const format = zodTextFormat(schema, "lexical_batch_analysis");
  assert.deepEqual((format.schema as { required: string[] }).required, ["word_0", "word_1"]);
});
