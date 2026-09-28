import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, Brain, BookOpenCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { ReadingAssessment } from "./ReadingAssessment";
import { ReadingText } from "./ReadingText";

type ReadingQuestion = {
  type: "COMPREHENSION" | "VOCABULARY" | "GRAMMAR";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  grammarConceptId: string | null;
};

export default async function ReadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const reading = await db.story.findFirst({
    where: { id, userId: user.id },
    include: {
      targets: {
        orderBy: { position: "asc" },
        include: {
          lexeme: {
            include: { translations: true },
          },
        },
      },
      grammarTargets: {
        orderBy: { position: "asc" },
        include: { grammarConcept: true },
      },
    },
  });
  if (!reading) notFound();

  const questions = reading.questions as unknown as ReadingQuestion[];

  return (
    <main className="page generated-reading-page">
      <section className="page-header compact reading-document-header">
        <Link href="/reading" className="back-link">
          <ArrowLeft size={16} />
          Reading
        </Link>
        <div className="word-meta">
          <span className="badge">{reading.level}</span>
          <span className="badge">{reading.length.toLowerCase()}</span>
          {reading.completedAt ? (
            <span className="badge">
              {Math.round((reading.comprehensionScore ?? 0) * 100)}% comprehension
            </span>
          ) : null}
        </div>
        <h1>{reading.title}</h1>
        {reading.topic ? (
          <p className="page-description">{reading.topic}</p>
        ) : null}
      </section>

      <ReadingText
        content={reading.content}
        preference={user.preferredTranslation}
        targets={reading.targets.map((target) => ({
          id: target.lexeme.id,
          lemma: target.lexeme.lemma,
          article: target.lexeme.article,
          partOfSpeech: target.lexeme.partOfSpeech,
          cefrLevel: target.lexeme.cefrLevel,
          translations: target.lexeme.translations.map((translation) => ({
            language: translation.language,
            text: translation.text,
          })),
        }))}
      />

      {reading.grammarTargets.length ? (
        <section className="panel reading-language-notes">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OPTIONAL LANGUAGE NOTES</p>
              <h2>Grammar in context</h2>
            </div>
            <Brain size={19} />
          </div>
          <p className="muted">
            Open these only when you want to inspect the language. They are not required to understand the text.
          </p>
          <div className="question-list">
            {reading.grammarTargets.map((target) => (
              <details className="question-item" key={target.id}>
                <summary>
                  <span className="badge">{target.grammarConcept.introducedAt}</span>
                  {target.grammarConcept.title}
                </summary>
                {target.excerpt ? <blockquote>{target.excerpt}</blockquote> : null}
                {target.explanation ? <p>{target.explanation}</p> : null}
                <Link
                  className="text-link"
                  href={"/grammar/" + target.grammarConcept.slug}
                >
                  Learn this grammar
                </Link>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <ReadingAssessment readingId={reading.id} questions={questions} />

      <section className="panel reading-language-summary">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LANGUAGE IN THIS TEXT</p>
            <h2>What you encountered</h2>
          </div>
          <BookOpenCheck size={19} />
        </div>

        {reading.grammarTargets.length ? (
          <div className="reading-summary-group">
            <strong>Grammar</strong>
            <div className="relation-list">
              {reading.grammarTargets.map((target) => (
                <Link
                  className="relation-chip"
                  href={"/grammar/" + target.grammarConcept.slug}
                  key={target.id}
                >
                  <span>{target.grammarConcept.title}</span>
                  <small>{target.intentional ? "targeted" : "encountered"}</small>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {reading.targets.length ? (
          <div className="reading-summary-group">
            <strong>Vocabulary</strong>
            <div className="relation-list">
              {reading.targets.map((target) => (
                <Link
                  className="relation-chip"
                  href={"/vocabulary/" + target.lexeme.id}
                  key={target.id}
                >
                  <span>{target.lexeme.lemma}</span>
                  {target.lexeme.translations
                    .filter((translation) =>
                      isTranslationVisible(
                        user.preferredTranslation,
                        translation.language,
                      ),
                    )
                    .slice(0, 1)
                    .map((translation) => (
                      <small key={translation.id}>{translation.text}</small>
                    ))}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel story-summary">
        <h2 className="section-title">Summary</h2>
        {user.preferredTranslation !== "PERSIAN" && reading.englishSummary ? (
          <p>{reading.englishSummary}</p>
        ) : null}
        {user.preferredTranslation !== "ENGLISH" && reading.persianSummary ? (
          <p className="rtl">{reading.persianSummary}</p>
        ) : null}
      </section>
    </main>
  );
}
