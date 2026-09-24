import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible, translationLabel } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function Word({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const word = await db.lexeme.findUnique({
    where: { id },
    include: {
      translations: true,
      patterns: true,
      examples: true,
      userStates: { where: { userId: user.id }, take: 1 },
    },
  });

  if (!word || word.userStates.length === 0) notFound();
  const state = word.userStates[0];
  const translations = word.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  return (
    <main>
      <div className="hero">
        <p className="muted">{word.partOfSpeech} · {state.state}</p>
        <h1 style={{ fontSize: "4rem" }}>
          {word.article ? `${word.article} ` : ""}{word.lemma}
        </h1>
        {word.plural && <p>Plural: {word.plural}</p>}
      </div>

      <section className="grid">
        <div className="card">
          <h2>Meaning</h2>
          {translations.map((translation) => (
            <div key={translation.id}>
              <small className="muted">{translationLabel(translation.language)}</small>
              <p className={translation.language === "fa" ? "rtl" : undefined}>
                {translation.text}
              </p>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Learning state</h2>
          <p>Recognition: {Math.round(state.recognition * 100)}%</p>
          <p>Meaning recall: {Math.round(state.meaningRecall * 100)}%</p>
          <p>Production: {Math.round(state.production * 100)}%</p>
          <p>Context: {Math.round(state.contextualUsage * 100)}%</p>
          {state.nextReviewAt && (
            <p className="muted">Next review: {state.nextReviewAt.toLocaleString()}</p>
          )}
        </div>

        <div className="card">
          <h2>Patterns</h2>
          {word.patterns.length ? word.patterns.map((pattern) => (
            <p key={pattern.id}>
              <b>{pattern.pattern}</b><br />
              <span className="muted">{pattern.explanation}</span>
            </p>
          )) : <p className="muted">No patterns yet.</p>}
        </div>
      </section>

      <h2>Context</h2>
      <div className="grid">
        {word.examples.map((example) => (
          <div className="card" key={example.id}>
            <p>{example.german}</p>
            {user.preferredTranslation !== "PERSIAN" && (
              <p className="muted">{example.english}</p>
            )}
            {user.preferredTranslation !== "ENGLISH" && (
              <p className="rtl muted">{example.persian}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
