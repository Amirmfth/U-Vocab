type LexemeLabelInput = {
  article?: string | null;
  lemma: string;
};

export function formatLexemeLabel({ article, lemma }: LexemeLabelInput) {
  const cleanLemma = lemma.trim();
  const cleanArticle = article?.trim();

  if (!cleanArticle || /^(null|undefined)$/iu.test(cleanArticle)) {
    return cleanLemma;
  }

  const normalizedArticle = cleanArticle.toLocaleLowerCase("de-DE");
  const normalizedLemma = cleanLemma.toLocaleLowerCase("de-DE");
  return normalizedLemma.startsWith(normalizedArticle + " ")
    ? cleanLemma
    : cleanArticle + " " + cleanLemma;
}
