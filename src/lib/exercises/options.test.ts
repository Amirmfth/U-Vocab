import assert from "node:assert/strict";
import test from "node:test";
import { deterministicChoiceOptions } from "./options";

test("builds four unique choices with the expected answer",()=>{
  const options=deterministicChoiceOptions(
    "table",
    ["chair","window","door","book","street"],
  );
  assert.equal(options.length,4);
  assert.equal(new Set(options).size,4);
  assert.ok(options.includes("table"));
});

test("different expected answers rotate distractors",()=>{
  const pool=["one","two","three","four","five","six"];
  const first=deterministicChoiceOptions("alpha",pool);
  const second=deterministicChoiceOptions("beta",pool);
  assert.notDeepEqual(first.filter((item)=>item!=="alpha"),second.filter((item)=>item!=="beta"));
});
