const GERMAN_STOPWORDS = new Set([
  "aber","alle","als","also","am","an","auch","auf","aus","bei","bin","bis","bist",
  "da","dadurch","daher","darum","das","dass","dein","deine","dem","den","der","des",
  "die","dies","diese","doch","dort","du","durch","ein","eine","einem","einen","einer",
  "er","es","für","hat","habe","haben","hier","ich","im","in","ist","ja","jede","jeder",
  "kein","keine","mit","muss","nach","nicht","noch","nun","nur","oder","sein","seine",
  "sich","sie","sind","so","über","um","und","uns","unter","vom","von","vor","war","was",
  "weil","wenn","wie","wieder","wir","wird","wo","zu","zum","zur",
]);

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function normalizedGermanTokens(text: string) {
  return text
    .toLocaleLowerCase("de-DE")
    .match(/[a-zäöüß][a-zäöüß'-]{2,}/gu) ?? [];
}

export function detectRepeatedWords(text: string, minimum = 3) {
  const counts = new Map<string, number>();
  for (const token of normalizedGermanTokens(text)) {
    if (GERMAN_STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return Array.from(counts, ([word, count]) => ({ word, count }))
    .filter((item) => item.count >= minimum)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function detectLexemePresence(text: string, lemmas: string[]) {
  const haystack = " " + text.toLocaleLowerCase("de-DE").replace(/[^a-zäöüß'-]+/gu, " ") + " ";
  return lemmas.filter((lemma) => {
    const needle = lemma.toLocaleLowerCase("de-DE").trim();
    return needle.length >= 3 && haystack.includes(" " + needle + " ");
  });
}

export function rankReadingCandidates(
  text: string,
  knownLemmas: Set<string>,
  limit = 30,
) {
  const counts = new Map<string, number>();
  for (const token of normalizedGermanTokens(text)) {
    if (GERMAN_STOPWORDS.has(token) || knownLemmas.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts, ([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count || b.token.length - a.token.length)
    .slice(0, limit);
}

export function buildReadingExcerpt(
  text: string,
  candidates: Array<{ token: string }>,
  maxChars = 12_000,
) {
  if (text.length <= maxChars) return text;

  const candidateSet = new Set(candidates.map((item) => item.token));
  const sentences = text.split(/(?<=[.!?])\s+/u);
  const selected = sentences.filter((sentence) => {
    const tokens = normalizedGermanTokens(sentence);
    return tokens.some((token) => candidateSet.has(token));
  });

  const joined = selected.join(" ");
  if (joined.length >= 500) return joined.slice(0, maxChars);
  return text.slice(0, maxChars);
}
