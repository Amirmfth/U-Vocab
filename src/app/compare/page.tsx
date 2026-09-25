import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { CompareForm } from "./CompareForm";
import { QuickCompareSuggestion } from "./QuickCompareSuggestion";


function normalized(value: string | null) {
  return value?.toLocaleLowerCase("de-DE").trim() ?? "";
}

export default async function ComparePage() {
  await connection();
  const user = await getCurrentUser();

  const [vocabulary, pairs, wordChoiceMistakes] = await Promise.all([
    db.userVocabulary.findMany({
      where: { userId: user.id },
      include: { lexeme: true },
      orderBy: { addedAt: "desc" },
      take: 300,
    }),
    db.confusionPair.findMany({
      where: { userId: user.id },
      include: { leftLexeme: true, rightLexeme: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.mistake.findMany({
      where: {
        userId: user.id,
        type: "WORD_CHOICE",
        resolvedAt: null,
      },
      orderBy: [{ occurrences: "desc" }, { lastOccurredAt: "desc" }],
      take: 20,
    }),
  ]);

  const byLemma = new Map(
    vocabulary.map((item) => [normalized(item.lexeme.lemma), item.lexeme.id]),
  );

  const mistakeSuggestions = wordChoiceMistakes.flatMap((mistake) => {
    const left = byLemma.get(normalized(mistake.expected));
    const right = byLemma.get(normalized(mistake.actual));
    return left && right && left !== right ? [{ left, right, mistake }] : [];
  });

  const options = vocabulary.map((item) => ({
    value: item.lexeme.id,
    label: formatLexemeLabel(item.lexeme),
  }));

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">CONFUSION TRAINER</p>
        <h1>Compare German words</h1>
        <p className="page-description">
          Learn the practical distinction between semantically close or commonly
          confused lexical units, then prove it with contrast exercises.
        </p>
      </section>

      {options.length >= 2 ? (
        <CompareForm options={options} />
      ) : (
        <div className="empty-state">
          <strong>Add at least two lexical units first.</strong>
        </div>
      )}

      {mistakeSuggestions.length ? (
        <section className="page-section">
          <h2 className="section-title">Suggested from Mistake Memory</h2>
          <div className="compare-suggestion-list">
            {mistakeSuggestions.slice(0, 5).map((suggestion) => {
              const left = vocabulary.find((item) => item.lexeme.id === suggestion.left)!;
              const right = vocabulary.find((item) => item.lexeme.id === suggestion.right)!;
              return (
                <article className="compare-suggestion" key={suggestion.mistake.id}>
                  <GitCompareArrows size={18} />
                  <div>
                    <strong>{left.lexeme.lemma} / {right.lexeme.lemma}</strong>
                    <span>{suggestion.mistake.occurrences} recurring word-choice mistakes</span>
                  </div>
                  <QuickCompareSuggestion
                    leftLexemeId={suggestion.left}
                    rightLexemeId={suggestion.right}
                  />
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {pairs.length ? (
        <section className="page-section">
          <h2 className="section-title">Tracked comparisons</h2>
          <div className="collection-list">
            {pairs.map((pair) => (
              <Link href={"/compare/" + pair.id} className="collection-row" key={pair.id}>
                <div>
                  <strong>{pair.leftLexeme.lemma} / {pair.rightLexeme.lemma}</strong>
                  <span>
                    {pair.state.toLowerCase()} · {pair.correctAttempts}/{pair.attempts} correct
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
