import assert from "node:assert/strict";
import test from "node:test";
import { rankGrammarRecommendation } from "./recommendations";

const base = {
  introducedAt: "B1" as const,
  unresolvedMistakes: 0,
  recentEvidenceAt: null,
  recentEvidenceCount: 0,
  relatedVocabularyCount: 0,
  prerequisiteIds: [] as string[],
};

test("recurring grammar weakness outranks learning and next-level concepts", () => {
  const result = rankGrammarRecommendation(
    [
      { ...base, id:"weak", slug:"weak", title:"Weak", status:"NEEDS_ATTENTION", unresolvedMistakes:4 },
      { ...base, id:"learning", slug:"learning", title:"Learning", status:"LEARNING" },
      { ...base, id:"next", slug:"next", title:"Next", status:"UNASSESSED" },
    ],
    new Map(),
    "B1",
    "B2",
  );
  assert.equal(result?.candidate.id, "weak");
  assert.equal(result?.reasonCode, "WEAKNESS");
});

test("learning outranks a new target concept when no weakness exists", () => {
  const result = rankGrammarRecommendation(
    [
      { ...base, id:"learning", slug:"learning", title:"Learning", status:"LEARNING" },
      { ...base, id:"next", slug:"next", title:"Next", status:"UNASSESSED" },
    ],
    new Map(),
    "B1",
    "B2",
  );
  assert.equal(result?.candidate.id, "learning");
  assert.equal(result?.reasonCode, "CONTINUE");
});

test("strong concepts are not recommended and prerequisite gaps are explainable", () => {
  const result = rankGrammarRecommendation(
    [
      { ...base, id:"advanced", slug:"advanced", title:"Advanced", status:"UNASSESSED", prerequisiteIds:["prereq"] },
      { ...base, id:"prereq", slug:"prereq", title:"Prerequisite", status:"UNASSESSED", introducedAt:"A2" },
      { ...base, id:"strong", slug:"strong", title:"Strong", status:"STRONG" },
    ],
    new Map([["strong","STRONG"]]),
    "B1",
    "B2",
  );
  assert.equal(result?.candidate.id, "prereq");
  assert.equal(result?.reasonCode, "PREREQUISITE");
});


test("new concepts avoid recent overexposure and prefer concepts tied to personal vocabulary", () => {
  const result = rankGrammarRecommendation(
    [
      { ...base, id:"overexposed", slug:"overexposed", title:"Overexposed", status:"UNASSESSED", recentEvidenceCount:3, relatedVocabularyCount:5 },
      { ...base, id:"linked", slug:"linked", title:"Linked", status:"UNASSESSED", relatedVocabularyCount:3 },
      { ...base, id:"plain", slug:"plain", title:"Plain", status:"UNASSESSED", relatedVocabularyCount:0 },
    ],
    new Map(),
    "B1",
    "B2",
  );
  assert.equal(result?.candidate.id, "linked");
  assert.equal(result?.reasonCode, "NEXT_TARGET");
});
