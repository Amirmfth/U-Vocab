import assert from "node:assert/strict";
import test from "node:test";
import {
  grammarCurriculum,
  validateGrammarCurriculum,
} from "./curriculum";

test("canonical grammar curriculum is internally valid", () => {
  assert.deepEqual(validateGrammarCurriculum(), []);
  assert.ok(grammarCurriculum.length >= 50);
});

test("curriculum covers A1 through B2 introduction levels", () => {
  const levels = new Set(grammarCurriculum.map((concept) => concept.introducedAt));
  for (const level of ["A1", "A2", "B1", "B2"]) {
    assert.ok(levels.has(level as "A1" | "A2" | "B1" | "B2"));
  }
});

test("duplicate IDs and prerequisite cycles are rejected", () => {
  const duplicate = [
    ...grammarCurriculum,
    { ...grammarCurriculum[0], slug: "duplicate-test-slug" },
  ];
  assert.ok(validateGrammarCurriculum(duplicate).some((error) => error.includes("Duplicate grammar concept id")));

  const cyclic = [
    {
      ...grammarCurriculum[0],
      id: "cycle.a",
      slug: "cycle-a",
      prerequisites: ["cycle.b"],
    },
    {
      ...grammarCurriculum[1],
      id: "cycle.b",
      slug: "cycle-b",
      prerequisites: ["cycle.a"],
    },
  ];
  assert.ok(validateGrammarCurriculum(cyclic).some((error) => error.includes("cycle")));
});
