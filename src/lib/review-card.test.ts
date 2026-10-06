import assert from "node:assert/strict";
import test from "node:test";
import { buildReviewCard } from "./review-card";

const lexeme={
  language:"de",
  lemma:"warten",
  article:null,
  partOfSpeech:"VERB",
  translations:[{ language:"en",text:"to wait" }],
  patterns:[{ pattern:"auf + Akkusativ warten",explanation:null }],
  examples:[{ targetText:"Ich warte auf den Bus." }],
};

test("grammar mistakes still produce a translation review card",()=>{
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
  assert.equal(card.family,"MEANING_TARGET");
  assert.equal(card.front.prompt,"to wait");
  assert.match(card.back.answer,/warten/);
});

test("weak contextual usage still produces a translation review card",()=>{
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
  assert.equal(card.family,"TARGET_MEANING");
  assert.equal(card.front.prompt,"warten");
  assert.equal(card.back.answer,"to wait");
});

test("production weakness flips review direction meaning to target",()=>{
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
  assert.equal(card.family,"MEANING_TARGET");
  assert.equal(card.front.prompt,"to wait");
  assert.match(card.back.answer,/warten/);
});
