import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  LifeBuoy,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { db } from "@/lib/db";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
import { ReviewCard } from "./ReviewCard";

function ReviewModes({
  mistakes,
  weak,
}: {
  mistakes: number;
  weak: number;
}) {
  return (
    <nav className="review-mode-list" aria-label="Review modes">
      <Link href="/mistakes">
        <TriangleAlert size={18} />
        <span><strong>Mistakes</strong><small>{mistakes} unresolved</small></span>
        <ArrowRight size={16} />
      </Link>
      <Link href="/rescue">
        <LifeBuoy size={18} />
        <span><strong>Rescue</strong><small>{weak} weak-production words</small></span>
        <ArrowRight size={16} />
      </Link>
      <Link href="/focus">
        <TimerReset size={18} />
        <span><strong>Focus</strong><small>Build a structured review block</small></span>
        <ArrowRight size={16} />
      </Link>
    </nav>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  await connection();
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const now = new Date();

  const [dueCount, mistakeCount, weakCount] = await Promise.all([
    db.userVocabulary.count({
      where: {
        userId: user.id,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
    }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
    db.userVocabulary.count({
      where: { userId: user.id, production: { lt: 0.4 } },
    }),
  ]);

  if (query.start !== "1") {
    return (
      <main className="page review-landing">
        <section className="review-hero">
          <div>
            <p className="eyebrow">REVIEW</p>
            <h1>{dueCount ? dueCount + " due now" : "You're caught up"}</h1>
            <p>
              {dueCount
                ? "Keep recall stable with a short spaced-review session."
                : "No scheduled reviews are due. Reinforce mistakes or weak words instead."}
            </p>
          </div>
          {dueCount ? (
            <Link href="/review?start=1" className="button button-primary review-start">
              <Brain size={18} />
              Start review
            </Link>
          ) : (
            <Link href="/rescue" className="button button-primary review-start">
              <LifeBuoy size={18} />
              Reinforce weak words
            </Link>
          )}
        </section>

        <section className="review-queue-summary" aria-label="Review status">
          <div><strong>{dueCount}</strong><span>due</span></div>
          <div><strong>{mistakeCount}</strong><span>mistakes</span></div>
          <div><strong>{weakCount}</strong><span>weak</span></div>
        </section>

        <ReviewModes mistakes={mistakeCount} weak={weakCount} />
      </main>
    );
  }

  const item = await db.userVocabulary.findFirst({
    where: {
      userId: user.id,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
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
      <main className="page review-session-shell">
        <section className="empty-state compact-empty">
          <strong>Review complete</strong>
          <span className="muted">Nothing else is due right now.</span>
          <div className="ia-empty-actions">
            <Link href="/review" className="button button-primary">Back to Review</Link>
            <Link href="/practice" className="button button-secondary">Practice</Link>
          </div>
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

  const exercise = buildExercise(
    exerciseType,
    item.lexeme,
    user.preferredTranslation,
  );
  const translations = item.lexeme.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  return (
    <main className="page review-session-shell">
      <header className="review-session-topbar">
        <Link href="/review" className="text-link">Review</Link>
        <span>{dueCount} remaining</span>
      </header>
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
