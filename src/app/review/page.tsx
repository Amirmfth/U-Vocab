import { connection } from "next/server";
import Link from "next/link";
import {
  Brain,
  LifeBuoy,
  TriangleAlert,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getReviewQueueData } from "@/lib/review-queue";
import { getRescueWords } from "@/lib/rescue";
import { ReviewSession } from "./ReviewSession";

function ReviewModes({
  mistakes,
  rescueCount,
}: {
  mistakes: number;
  rescueCount: number;
}) {
  return (
    <nav className="practice-lanes review-mode-grid" aria-label="Review modes">
      <Link href="/mistakes" className="practice-lane">
        <span className="review-mode-count" aria-label={`${mistakes} unresolved mistakes`}>{mistakes}</span>
        <span className="practice-lane-icon"><TriangleAlert size={30} /></span>
        <span className="practice-lane-copy"><strong>Mistakes</strong></span>
      </Link>
      <Link href="/rescue" className="practice-lane">
        <span className="review-mode-count" aria-label={`${rescueCount} rescue words`}>{rescueCount}</span>
        <span className="practice-lane-icon"><LifeBuoy size={30} /></span>
        <span className="practice-lane-copy"><strong>Rescue</strong></span>
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
  const [dueCount, mistakeCount, rescueWords] = await Promise.all([
    db.userVocabulary.count({
      where: {
        userId: user.id,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
    }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
    getRescueWords(user.id, Number.POSITIVE_INFINITY),
  ]);
  const rescueCount = rescueWords.length;

  return (
      <main className="page review-landing review-page">
        <section className="review-hero">
          <div>
            <h1>{dueCount ? dueCount + " due now" : "You're caught up"}</h1>
            <p>
              {dueCount
                ? "Use active recall on vocabulary that FSRS says is due."
                : "No retention reviews are due. Practice mistakes or weak skills instead."}
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

        <ReviewModes mistakes={mistakeCount} rescueCount={rescueCount} />
      </main>
  );
}
