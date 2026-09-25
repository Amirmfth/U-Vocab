import assert from "node:assert/strict";
import test from "node:test";
import { buildReviewCard } from "./review-card";

const lexeme={
  lemma:"warten",
  article:null,
  partOfSpeech:"VERB",
  translations:[{ language:"en",text:"to wait" }],
  patterns:[{ pattern:"auf + Akkusativ warten",explanation:null }],
  examples:[{ german:"Ich warte auf den Bus." }],
};

test("grammar mistakes produce a compact pattern card without answer leakage",()=>{
  const card=buildReviewCard({
    lexeme,
    preference:"ENGLISH",
    snapshot:{
      recognition:.8,
      meaningRecall:.8,
      production:.5,
      contextualUsage:.5,
      mistakeTypes:["PREPOSITION"],
    },
    recentTypes:[],
  });
  assert.equal(card.family,"GRAMMAR_PATTERN");
  assert.ok(!card.front.prompt.includes("auf + Akkusativ"));
  assert.equal(card.back.answer,"auf + Akkusativ warten");
});

test("weak contextual usage can produce a cloze review card",()=>{
  const card=buildReviewCard({
    lexeme,
    preference:"ENGLISH",
    snapshot:{
      recognition:.8,
      meaningRecall:.8,
      production:.8,
      contextualUsage:.2,
      mistakeTypes:[],
    },
    recentTypes:[],
  });
  assert.equal(card.family,"CONTEXT_CLOZE");
  assert.match(card.front.prompt,/_____/);
  assert.ok(card.back.answer.length>0);
});

test("production weakness flips review direction meaning to German",()=>{
  const card=buildReviewCard({
    lexeme:{ ...lexeme,patterns:[],examples:[] },
    preference:"ENGLISH",
    snapshot:{
      recognition:.8,
      meaningRecall:.8,
      production:.2,
      contextualUsage:.8,
      mistakeTypes:[],
    },
    recentTypes:[],
  });
  assert.equal(card.family,"MEANING_GERMAN");
  assert.equal(card.front.prompt,"to wait");
  assert.match(card.back.answer,/warten/);
});
