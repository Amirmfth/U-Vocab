export type ReadingQuestionForAssessment = {
  type: "COMPREHENSION" | "VOCABULARY" | "GRAMMAR";
  correctIndex: number;
  grammarConceptId: string | null;
};

export function scoreReadingAssessment(
  questions: ReadingQuestionForAssessment[],
  answers: number[],
) {
  const correct = questions.map(
    (question, index) =>
      Number.isInteger(answers[index]) && answers[index] === question.correctIndex,
  );
  const score = questions.length
    ? correct.filter(Boolean).length / questions.length
    : 0;
  const grammarEvidence = questions.flatMap((question, index) =>
    question.type === "GRAMMAR" && question.grammarConceptId
      ? [{
          grammarConceptId: question.grammarConceptId,
          correct: correct[index],
          questionIndex: index,
        }]
      : [],
  );
  return { correct, score, grammarEvidence };
}
