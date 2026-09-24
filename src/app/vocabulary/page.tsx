import Link from "next/link";
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
    <main>
      <div className="hero">
        <p className="muted">PERSONAL LIBRARY</p>
        <h1 style={{ fontSize: "3rem" }}>Vocabulary</h1>
        <p className="muted">
          {items.length} lexical {items.length === 1 ? "unit" : "units"} in your library.
        </p>
      </div>

      <div className="grid">
        {items.map((item) => {
          const word = item.lexeme;
          const translations = word.translations.filter((translation) =>
            isTranslationVisible(user.preferredTranslation, translation.language),
          );

          return (
            <Link className="card" key={item.id} href={`/vocabulary/${word.id}`}>
              <div className="word">
                {word.article ? `${word.article} ` : ""}{word.lemma}
              </div>
              {translations.map((translation) => (
                <p
                  key={translation.id}
                  className={translation.language === "fa" ? "rtl" : undefined}
                >
                  {translation.text}
                </p>
              ))}
              <small className="muted">
                {word.partOfSpeech} · {item.state}
              </small>
            </Link>
          );
        })}
      </div>

      {!items.length && (
        <p className="muted">No vocabulary yet. Add your first lexical unit.</p>
      )}
    </main>
  );
}
