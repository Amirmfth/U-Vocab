import assert from "node:assert/strict";
import test from "node:test";
import { csvAdapter } from "./csv";

test("CSV adapter maps bilingual lexical data", async () => {
  const rows = await csvAdapter.parse(
    'german,english,persian,pos,article,plural\nEntscheidung,decision,تصمیم,NOUN,die,Entscheidungen',
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].lemma, "Entscheidung");
  assert.equal(rows[0].englishMeaning, "decision");
  assert.equal(rows[0].persianMeaning, "تصمیم");
  assert.equal(rows[0].partOfSpeech, "NOUN");
  assert.equal(rows[0].article, "die");
});

test("CSV adapter handles quoted commas", async () => {
  const rows = await csvAdapter.parse(
    'german,english,persian,pos\n"eine Entscheidung treffen","make a decision, choose",تصمیم گرفتن,PHRASE',
  );

  assert.equal(rows[0].lemma, "eine Entscheidung treffen");
  assert.equal(rows[0].englishMeaning, "make a decision, choose");
});
