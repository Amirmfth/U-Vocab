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
import { db } from "@/lib/db";
import { getReviewQueueData } from "@/lib/review-queue";
import { ReviewSession } from "./ReviewSession";

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
  if (query.start === "1") {
    const initialQueue = await getReviewQueueData({
      userId: user.id,
      preferredTranslation: user.preferredTranslation,
    });

    return <ReviewSession initialData={initialQueue} userScope={user.id} />;
  }

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

  {
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

  }
}
