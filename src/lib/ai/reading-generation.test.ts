import assert from "node:assert/strict";
import test from "node:test";
import { generatedReadingSchema } from "./reading-generation";

test("generated reading schema stores structured grammar coverage and assessable questions", () => {
  const parsed = generatedReadingSchema.parse({
    title: "Ein neuer Anfang",
    content: "A".repeat(220),
    englishSummary: "Summary",
    persianSummary: "خلاصه",
    usedTargets: ["Entscheidung"],
    grammarCoverage: [{
      grammarConceptId: "de.relative.basic",
      excerpt: "Menschen, die hier wohnen",
      explanation: "Relative clause",
      intentional: true,
    }],
    questions: Array.from({ length: 4 }, (_, index) => ({
      type: index === 0 ? "GRAMMAR" : "COMPREHENSION",
      question: "Question " + index,
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: "Because A.",
      grammarConceptId: index === 0 ? "de.relative.basic" : null,
    })),
  });
  assert.equal(parsed.grammarCoverage[0].grammarConceptId, "de.relative.basic");
  assert.equal(parsed.questions[0].type, "GRAMMAR");
});
