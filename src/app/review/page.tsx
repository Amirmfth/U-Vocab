import { connection } from "next/server";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { db } from "@/lib/db";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
import { ReviewCard } from "./ReviewCard";


export default async function ReviewPage() {
  await connection();
  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: {
      userId: user.id,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
    },
    include: {
      lexeme: { include: { translations: true, patterns: true, examples: true } },
      attempts: { orderBy: { createdAt: "desc" }, take: 3, select: { exerciseType: true } },
    },
    orderBy: [{ nextReviewAt: "asc" }, { addedAt: "asc" }],
  });

  if (!item) {
    return (
      <main className="page focus-page">
        <section className="empty-state compact-empty">
          <strong>All caught up</strong>
          <Link href="/practice" className="button button-secondary">Practice anyway</Link>
        </section>
      </main>
    );
  }

  const mistakes = await db.mistake.findMany({
    where: { userId: user.id, lexemeId: item.lexemeId, resolvedAt: null },
    select: { type: true },
  });

  const exerciseType = selectReviewExerciseType(
    {
      recognition: item.recognition,
      meaningRecall: item.meaningRecall,
      production: item.production,
      contextualUsage: item.contextualUsage,
      mistakeTypes: mistakes.map((mistake) => mistake.type),
    },
    item.attempts.map((attempt) => attempt.exerciseType),
  );

  const exercise = buildExercise(exerciseType, item.lexeme, user.preferredTranslation);
  const translations = item.lexeme.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language));

  return (
    <main className="page focus-page">
      <div className="focus-meta"><span>Review</span><span>{item.lexeme.lemma}</span></div>
      <ReviewCard
        userVocabularyId={item.id}
        lemma={item.lexeme.lemma}
        article={item.lexeme.article}
        patterns={item.lexeme.patterns.map((pattern) => pattern.pattern)}
        translations={translations}
        exercise={exercise}
      />
    </main>
  );
}
