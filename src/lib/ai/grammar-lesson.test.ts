import assert from "node:assert/strict";
import test from "node:test";
import { grammarLessonSchema } from "./grammar-lesson";

test("rich grammar lesson schema accepts a complete structured lesson", () => {
  const parsed = grammarLessonSchema.parse({
    overview: "This is a sufficiently detailed overview ".repeat(5),
    intuition: "Think of the structure as a signal that changes what follows. ".repeat(3),
    whenToUse: ["When this trigger appears.", "When the meaning requires it."],
    recognitionCues: ["Look for the trigger.", "Notice the changed form."],
    formation: ["Identify the trigger.", "Apply the required form."],
    ruleDetails: ["Rule one.", "Rule two.", "Rule three."],
    tables: [{
      title: "Pattern",
      headers: ["Context", "Form"],
      rows: [["Example", "Form"]],
      note: null,
    }],
    examples: Array.from({ length: 6 }, (_, index) => ({
      german: "Das ist Beispiel " + index + ".",
      english: "This is example " + index + ".",
      note: "Shows the structure.",
    })),
    contrasts: [{
      title: "Contrast",
      thisConcept: "Use this here.",
      otherForm: "Use the other form there.",
      difference: "The trigger and meaning differ.",
    }],
    commonMistakes: [
      { wrong: "Wrong 1", correct: "Correct 1", explanation: "Reason 1" },
      { wrong: "Wrong 2", correct: "Correct 2", explanation: "Reason 2" },
    ],
    exceptions: [],
    usageNotes: ["Useful in everyday German."],
    speakingWritingTips: ["Check the trigger before choosing the form.", "Say the full chunk aloud."],
    memoryAids: ["Remember the trigger together with the form."],
    cheatSheet: ["Find the trigger.", "Choose the form.", "Check word order."],
  });

  assert.equal(parsed.examples.length, 6);
  assert.equal(parsed.cheatSheet.length, 3);
});
