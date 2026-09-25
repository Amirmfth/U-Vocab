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

function ReviewTools() {
  return (
    <section className="ia-tool-strip review-tool-strip" aria-label="Review modes">
      <Link href="/review" className="ia-tool-link is-current">
        <Brain size={17} />
        <span><strong>Standard</strong><small>Due spaced reviews</small></span>
      </Link>
      <Link href="/mistakes" className="ia-tool-link">
        <TriangleAlert size={17} />
        <span><strong>Mistakes</strong><small>Fix recurring errors</small></span>
      </Link>
      <Link href="/rescue" className="ia-tool-link">
        <LifeBuoy size={17} />
        <span><strong>Rescue</strong><small>Reinforce weak words</small></span>
      </Link>
      <Link href="/focus" className="ia-tool-link">
        <TimerReset size={17} />
        <span><strong>Focus</strong><small>Structured review session</small></span>
      </Link>
    </section>
  );
}

export default async function ReviewPage() {
  await connection();
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
      <main className="page">
        <section className="page-header compact">
          <p className="eyebrow">REVIEW</p>
          <h1>Learning maintenance</h1>
          <p className="page-description">
            Keep recall healthy, revisit mistakes, and reinforce words that are
            slipping.
          </p>
        </section>
        <ReviewTools />
        <section className="empty-state compact-empty">
          <strong>All caught up</strong>
          <span className="muted">There are no spaced reviews due right now.</span>
          <div className="ia-empty-actions">
            <Link href="/rescue" className="button button-primary">
              Rescue weak words <ArrowRight size={17} />
            </Link>
            <Link href="/practice" className="button button-secondary">
              Practice anyway
            </Link>
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
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">REVIEW</p>
        <h1>Learning maintenance</h1>
        <p className="page-description">
          Start with what is due, or switch to a focused reinforcement mode.
        </p>
      </section>
      <ReviewTools />
      <section className="focus-page">
        <div className="focus-meta">
          <span>Due now</span>
          <span>{item.lexeme.lemma}</span>
        </div>
        <ReviewCard
          userVocabularyId={item.id}
          lemma={item.lexeme.lemma}
          article={item.lexeme.article}
          patterns={item.lexeme.patterns.map((pattern) => pattern.pattern)}
          translations={translations}
          exercise={exercise}
        />
      </section>
    </main>
  );
}
