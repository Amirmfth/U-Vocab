import assert from "node:assert/strict";
import test from "node:test";
import { buildCloze, buildExercise, eligibleExerciseTypes } from "./build";
import { applyMasteryDelta, practiceMasteryDelta } from "./mastery";
import { selectExerciseType } from "./select";

const noun={
  lemma:"Tisch",
  article:"der",
  partOfSpeech:"NOUN",
  translations:[{ language:"en",text:"table" }],
  patterns:[{ pattern:"am Tisch",explanation:null }],
  examples:[{ german:"Der Tisch steht im Zimmer." }],
};

test("quick practice never needs open writing as a fallback",()=>{
  const available=eligibleExerciseTypes(noun);
  const type=selectExerciseType({
    recognition:.9,
    meaningRecall:.9,
    production:.9,
    contextualUsage:.9,
    mistakeTypes:[],
  },available,[]);
  assert.ok(!["FREE_SENTENCE","PARAPHRASE"].includes(type));
  assert.equal(buildExercise(type,noun,"ENGLISH").requiresAI,false);
});

test("article questions are deterministic choice exercises",()=>{
  const exercise=buildExercise("ARTICLE",noun,"ENGLISH");
  assert.equal(exercise.interaction,"choice");
  assert.deepEqual(exercise.options,["der","die","das"]);
  assert.equal(exercise.expected,"der");
});

test("cloze extracts an inflected surface form when it shares a stem",()=>{
  const cloze=buildCloze("Ich lerne heute Deutsch.","lernen");
  assert.ok(cloze);
  assert.equal(cloze?.expected.toLocaleLowerCase("de-DE"),"lerne");
  assert.match(cloze?.prompt??"",/_____/);
});

test("choice evidence weighs mastery less than typed production",()=>{
  const choice=practiceMasteryDelta("CONTEXTUAL_CHOICE",true,"choice");
  const typed=practiceMasteryDelta("REVERSE_RECALL",true,"short_text");
  assert.ok((choice.contextualUsage??0)<(typed.production??0));
  const updated=applyMasteryDelta(
    { recognition:.5,meaningRecall:.5,production:.99,contextualUsage:.5 },
    { production:.2 },
  );
  assert.equal(updated.production,1);
});
