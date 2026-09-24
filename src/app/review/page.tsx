import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { db } from "@/lib/db";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
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
      lexeme: {
        include: { translations: true, patterns: true, examples: true },
      },
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { exerciseType: true },
      },
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

  const mistakes = await db.mistake.findMany({
    where: {
      userId: user.id,
      lexemeId: item.lexemeId,
      resolvedAt: null,
    },
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

  const exercise = buildExercise(
    exerciseType,
    item.lexeme,
    user.preferredTranslation,
  );

  const translations = item.lexeme.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  return (
    <main>
      <div className="hero">
        <p className="muted">DUE NOW · CONTEXTUAL SRS</p>
        <h1 style={{ fontSize: "3rem" }}>Review</h1>
      </div>
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
