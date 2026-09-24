function normalize(value: string) {
  return value
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:()"'\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkDeterministicAnswer(answer: string, expected: string) {
  const actual = normalize(answer);
  const target = normalize(expected);
  const correct =
    actual === target ||
    target.split(/[,;/]/).some((part) => actual === normalize(part));

  return {
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? "Correct." : "Not quite. Expected: " + expected,
  };
}
