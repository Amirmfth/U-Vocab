import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function Vocabulary() {
  const user = await getCurrentUser();
  const items = await db.userVocabulary.findMany({
    where: { userId: user.id },
    include: { lexeme: { include: { translations: true, patterns: true } } },
    orderBy: { addedAt: "desc" },
    take: 100,
  });

  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">PERSONAL LIBRARY</p>
        <h1>Vocabulary</h1>
        <p className="page-description">
          {items.length} lexical {items.length === 1 ? "unit" : "units"} stored
          with grammar, context, bilingual meanings, and learner state.
        </p>
        <div className="hero-actions">
          <Link href="/vocabulary/new" className="button button-primary">
            <Plus size={18} />
            Add vocabulary
          </Link>
        </div>
      </section>

      {items.length ? (
        <div className="grid vocabulary-grid">
          {items.map((item) => {
            const word = item.lexeme;
            const translations = word.translations.filter((translation) =>
              isTranslationVisible(user.preferredTranslation, translation.language),
            );

            return (
              <Link className="card vocabulary-card" key={item.id} href={"/vocabulary/" + word.id}>
                <div className="word-meta">
                  <span className="badge">{word.partOfSpeech}</span>
                  <span className="badge">{item.state}</span>
                </div>
                <div className="word">
                  {word.article ? word.article + " " : ""}{word.lemma}
                </div>
                <div className="translation-stack">
                  {translations.map((translation) => (
                    <p
                      key={translation.id}
                      className={translation.language === "fa" ? "rtl" : undefined}
                    >
                      {translation.text}
                    </p>
                  ))}
                </div>
                <div className="mastery-line">
                  <span
                    style={{
                      width:
                        Math.round(
                          ((item.recognition + item.meaningRecall + item.production + item.contextualUsage) / 4) * 100,
                        ) + "%",
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={24} />
          <strong>Your vocabulary library is empty.</strong>
          <span>Add your first German lexical unit to begin.</span>
          <Link href="/vocabulary/new" className="button button-primary">
            <Plus size={18} />
            Add first word
          </Link>
        </div>
      )}
    </main>
  );
}
