import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { comparisonSchema } from "@/lib/ai/compare-words";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { ComparisonTrainer } from "./ComparisonTrainer";


export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const pair = await db.confusionPair.findFirst({
    where: { id, userId: user.id },
    include: {
      leftLexeme: { include: { translations: true } },
      rightLexeme: { include: { translations: true } },
    },
  });

  if (!pair?.content) notFound();
  const parsed = comparisonSchema.safeParse(pair.content);
  if (!parsed.success) notFound();

  const content = parsed.data;
  const leftLabel =
    (pair.leftLexeme.article ? pair.leftLexeme.article + " " : "") +
    pair.leftLexeme.lemma;
  const rightLabel =
    (pair.rightLexeme.article ? pair.rightLexeme.article + " " : "") +
    pair.rightLexeme.lemma;

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href="/compare" className="back-link">
          <ArrowLeft size={16} />
          Compare
        </Link>
        <div className="word-meta">
          <span className="badge">{pair.state.toLowerCase()}</span>
          <span className="badge">
            {pair.correctAttempts}/{pair.attempts} correct
          </span>
        </div>
        <h1>{leftLabel} / {rightLabel}</h1>
        {pair.state === "LEARNED" ? (
          <div className="compare-learned">
            <CheckCircle2 size={17} />
            Learned distinction
          </div>
        ) : null}
      </section>

      <section className="panel compare-distinction">
        <p className="eyebrow">PRAKTISCHER UNTERSCHIED</p>
        <p className="compare-german">{content.germanDistinction}</p>

        {isTranslationVisible(user.preferredTranslation, "en") ? (
          <p>{content.englishDistinction}</p>
        ) : null}
        {isTranslationVisible(user.preferredTranslation, "fa") ? (
          <p className="rtl">{content.persianDistinction}</p>
        ) : null}

        <div className="compare-contrast-grid">
          {content.contrasts.map((contrast) => (
            <div className="compare-contrast-row" key={contrast.label}>
              <strong>{contrast.label}</strong>
              <span>{contrast.left}</span>
              <span>{contrast.right}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel compare-examples">
        <p className="eyebrow">CONTRASTIVE EXAMPLES</p>
        {content.examples.map((example, index) => (
          <article className="compare-example" key={index}>
            <div className="word-meta">
              <span className="badge">
                {example.answer === "LEFT" ? leftLabel : rightLabel}
              </span>
            </div>
            <strong>{example.german}</strong>
            {isTranslationVisible(user.preferredTranslation, "en") ? (
              <span>{example.english}</span>
            ) : null}
            {isTranslationVisible(user.preferredTranslation, "fa") ? (
              <span className="rtl">{example.persian}</span>
            ) : null}
            <small>{example.explanation}</small>
          </article>
        ))}
      </section>

      <ComparisonTrainer
        pairId={pair.id}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        content={content}
      />
    </main>
  );
}
