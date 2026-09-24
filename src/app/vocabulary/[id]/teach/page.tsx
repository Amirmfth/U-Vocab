import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Brain, Network } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { PracticeForm } from "@/app/practice/PracticeForm";
import { LexicalInsightPanel } from "../LexicalInsightPanel";
import { ScheduleReviewForm } from "./ScheduleReviewForm";


export default async function TeachWordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);

  const word = await db.lexeme.findFirst({
    where: {
      id,
      userStates: { some: { userId: user.id } },
    },
    include: {
      translations: true,
      patterns: true,
      examples: { take: 6 },
      insights: {
        where: { level: user.targetLevel },
        take: 1,
      },
      outgoing: {
        include: { target: { include: { translations: true } } },
        take: 8,
      },
      userStates: {
        where: { userId: user.id },
        take: 1,
      },
    },
  });

  if (!word || !word.userStates[0]) notFound();

  const insight = word.insights[0];
  const item = word.userStates[0];
  const visibleTranslations = word.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  const productionExercise = {
    type: "FREE_SENTENCE" as const,
    prompt: `Write a natural German sentence using “${word.lemma}”.`,
    hint: word.patterns[0]?.pattern,
    requiresAI: true,
  };

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href={"/vocabulary/" + word.id} className="back-link">
          <ArrowLeft size={16} />
          Back to word
        </Link>
        <p className="eyebrow">GUIDED WORD LESSON · {user.targetLevel}</p>
        <h1>{word.article ? word.article + " " : ""}{word.lemma}</h1>
        <p className="page-description">
          Understand the lexical unit, see how it behaves, then produce it yourself.
        </p>
      </section>

      <section className="lesson-grid">
        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">1 · MEANING</p>
              <h2>What it means</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          {visibleTranslations.map((translation) => (
            <p
              key={translation.id}
              className={translation.language === "fa" ? "rtl lesson-meaning" : "lesson-meaning"}
            >
              {translation.text}
            </p>
          ))}

          {insight ? (
            <>
              <h3>German definition</h3>
              <p>{insight.germanDefinition}</p>
              {user.preferredTranslation !== "PERSIAN" ? (
                <p className="muted">{insight.englishExplanation}</p>
              ) : null}
              {user.preferredTranslation !== "ENGLISH" ? (
                <p className="rtl muted">{insight.persianExplanation}</p>
              ) : null}
            </>
          ) : (
            <div className="empty-state compact-empty">
              <strong>No guided explanation yet.</strong>
              <span>Generate one at your current {user.targetLevel} level.</span>
            </div>
          )}
        </article>

        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">2 · PATTERN</p>
              <h2>How it behaves</h2>
            </div>
            <Brain size={20} />
          </div>

          {word.patterns.length ? (
            word.patterns.map((pattern) => (
              <div className="lesson-pattern" key={pattern.id}>
                <strong>{pattern.pattern}</strong>
                {pattern.explanation ? <p className="muted">{pattern.explanation}</p> : null}
              </div>
            ))
          ) : (
            <p className="muted">No structured grammar pattern is stored yet.</p>
          )}

          {insight ? <p>{insight.grammarNotes}</p> : null}
        </article>

        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">3 · CONTEXT</p>
              <h2>See it in use</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>

          <div className="lesson-examples">
            {word.examples.slice(0, 4).map((example) => (
              <div className="lesson-example" key={example.id}>
                <strong>{example.german}</strong>
                {user.preferredTranslation !== "PERSIAN" && example.english ? (
                  <span>{example.english}</span>
                ) : null}
                {user.preferredTranslation !== "ENGLISH" && example.persian ? (
                  <span className="rtl">{example.persian}</span>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel lesson-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">4 · CONNECTIONS</p>
              <h2>Related vocabulary</h2>
            </div>
            <Network size={20} />
          </div>

          {word.outgoing.length ? (
            <div className="relation-list">
              {word.outgoing.map((relation) => (
                <Link
                  key={relation.id}
                  href={"/vocabulary/" + relation.target.id}
                  className="relation-chip"
                >
                  <span>{relation.target.lemma}</span>
                  <small>{relation.type.replaceAll("_", " ")}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Use “Expand this word” to build this lexical family.</p>
          )}
        </article>
      </section>

      {!insight ? (
        <section className="panel learning-card">
          <LexicalInsightPanel lexemeId={word.id} hasInsight={false} />
        </section>
      ) : null}

      <section className="lesson-production">
        <div className="section-heading">
          <div>
            <p className="eyebrow">5 · PRODUCE</p>
            <h2>Make it active vocabulary</h2>
          </div>
          <Brain size={20} />
        </div>
        <PracticeForm
          userVocabularyId={item.id}
          lemma={word.lemma}
          exercise={productionExercise}
        />
      </section>

      <section className="panel lesson-footer-actions">
        <div>
          <p className="eyebrow">6 · RETAIN</p>
          <h2>Bring it back later</h2>
          <p className="muted">
            Add this lexical unit to the due queue. FSRS will take over after the next review.
          </p>
        </div>
        <ScheduleReviewForm lexemeId={word.id} />
      </section>
    </main>
  );
}
