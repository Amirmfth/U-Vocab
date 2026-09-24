export function lexicalKey(lemma: string, partOfSpeech: string) {
  return lemma.toLocaleLowerCase("de-DE").trim() + ":" + partOfSpeech;
}

export function deduplicateLexicalItems<
  T extends { lemma: string; partOfSpeech: string },
>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = lexicalKey(item.lemma, item.partOfSpeech);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
