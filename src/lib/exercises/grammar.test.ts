import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGrammarExercise,
  grammarEvidenceDimension,
  grammarExerciseVariants,
  grammarMistakeType,
} from "./grammar";

test("core grammar concepts expose deterministic variants", () => {
  for (const conceptId of [
    "de.case.dative",
    "de.preposition.two-way",
    "de.adjective.declension",
    "de.conjunction.subordinate-verb-final",
    "de.tense.perfekt",
    "de.relative.basic",
    "de.passive.present",
    "de.subjunctive.konjunktiv-ii-hypothetical",
  ]) {
    assert.ok(grammarExerciseVariants(conceptId).length > 0, conceptId);
  }
});

test("linked noun can produce a personalized article exercise", () => {
  const linked = { id:"l1", lemma:"Tisch", article:"der", pattern:null };
  const variants = grammarExerciseVariants("de.article.definite", linked);
  assert.equal(variants[0]?.key, "linked-noun-article");
  const exercise = buildGrammarExercise("de.article.definite", "linked-noun-article", linked);
  assert.equal(exercise?.expected, "der");
  assert.match(exercise?.prompt ?? "", /Tisch/);
});

test("grammar variants carry evidence dimension and mistake taxonomy", () => {
  assert.equal(
    grammarEvidenceDimension("de.conjunction.subordinate-verb-final", "weil-order"),
    "CONTROLLED_PRODUCTION",
  );
  assert.equal(
    grammarMistakeType("de.conjunction.subordinate-verb-final", "weil-order"),
    "VERB_POSITION",
  );
});
