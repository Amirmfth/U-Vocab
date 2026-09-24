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
    orderBy: { addedAt: "desc" }, take: 100,
  });

  return (
    <main className="page">
      <section className="page-header compact library-header">
        <div><h1>Vocabulary</h1><p className="muted">{items.length} {items.length === 1 ? "word" : "words"}</p></div>
        <Link href="/vocabulary/new" className="button button-primary"><Plus size={18} />Add word</Link>
      </section>

      {items.length ? (
        <div className="vocabulary-list">
          {items.map((item) => {
            const word = item.lexeme;
            const translations = word.translations.filter((translation) =>
              isTranslationVisible(user.preferredTranslation, translation.language));
            const mastery = Math.round(
              ((item.recognition + item.meaningRecall + item.production + item.contextualUsage) / 4) * 100);
            return (
              <Link className="vocabulary-row" key={item.id} href={"/vocabulary/" + word.id}>
                <div className="vocabulary-row-main">
                  <div className="word">{word.article ? word.article + " " : ""}{word.lemma}</div>
                  <div className="translation-line">
                    {translations.map((translation) => (
                      <span key={translation.id} className={translation.language === "fa" ? "rtl" : undefined}>
                        {translation.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="vocabulary-row-meta">
                  <span>{word.partOfSpeech}</span><span>{item.state.toLowerCase()}</span><span>{mastery}%</span>
                </div>
                <div className="mastery-line" aria-hidden="true"><span style={{ width: mastery + "%" }} /></div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <BookOpen size={22} /><strong>No words yet</strong>
          <Link href="/vocabulary/new" className="button button-primary"><Plus size={18} />Add your first word</Link>
        </div>
      )}
    </main>
  );
}
