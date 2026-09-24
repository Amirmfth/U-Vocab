import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { db } from "@/lib/db";
import { ReviewCard } from "./ReviewCard";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: {
      userId: user.id,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
    },
    include: {
      lexeme: { include: { translations: true, patterns: true } },
    },
    orderBy: [{ nextReviewAt: "asc" }, { addedAt: "asc" }],
  });

  if (!item) {
    return (
      <main>
        <div className="hero">
          <p className="muted">REVIEW</p>
          <h1 style={{ fontSize: "3rem" }}>You are caught up.</h1>
          <p className="muted">FSRS will surface vocabulary here when it becomes due.</p>
        </div>
      </main>
    );
  }

  const translations = item.lexeme.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  return (
    <main>
      <div className="hero">
        <p className="muted">DUE NOW</p>
        <h1 style={{ fontSize: "3rem" }}>Review</h1>
      </div>
      <ReviewCard
        userVocabularyId={item.id}
        lemma={item.lexeme.lemma}
        article={item.lexeme.article}
        patterns={item.lexeme.patterns.map((pattern) => pattern.pattern)}
        translations={translations}
      />
    </main>
  );
}
