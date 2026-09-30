import { lexiconAdapter } from "@/lib/lexicon/normalization";

export function germanWordListKey(word: string) {
  const normalized = lexiconAdapter("GERMAN").normalizeInput(word);
  return normalized.articleVariant ?? normalized.normalizedLookup;
}

export function parseWordList(input: string) {
  const words: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if ((char === "," || char === "\n" || char === "\r") && !quoted) {
      words.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  words.push(value.trim());

  return Array.from(
    new Map(
      words
        .filter(Boolean)
        .map((word) => [germanWordListKey(word), word]),
    ).values(),
  );
}
