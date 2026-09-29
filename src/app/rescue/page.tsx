import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LifeBuoy } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getRescueWords } from "@/lib/rescue";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { RescueSession } from "./RescueSession";
import type { RescueSessionCard } from "./RescueCard";


export default async function RescuePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; step?: string }>;
}) {
  await connection();
  const [user, course, query] = await Promise.all([getCurrentUser(), getCurrentCourse(), searchParams]);
  const requestedIds = Array.from(new Set(query.ids?.split(",").filter(Boolean) ?? [])).slice(0, 20);
  const ranked = await getRescueWords(user.id, 100, requestedIds);

  if (!query.ids) {
    const top = ranked.slice(0, 20);
    const rescueSet = top.slice(0, 10);

    return (
      <main className="page">
        <section className="page-header compact">
          <Link href="/review" className="back-link">
            <ArrowLeft size={16} />
            Review
          </Link>
          <h1>Rescue words</h1>
        </section>

        {top.length ? (
          <>
            <section className="rescue-list">
              {top.map((item, index) => (
                <article className="rescue-row" key={item.id}>
                  <div className="rescue-rank">{String(index + 1).padStart(2, "0")}</div>
                  <div className="rescue-row-copy">
                    <div>
                      <strong>
                        {formatLexemeLabel(item.lexeme)}
                      </strong>
                      <span>{Math.round(item.risk.retrievability * 100)}% retrievable now</span>
                    </div>
                    <div className="rescue-reasons">
                      {item.risk.reasons.map((reason) => (
                        <span key={reason}>{reason}</span>
                      ))}
                    </div>
                  </div>
                  <strong className="rescue-score">
                    {Math.round(item.risk.score * 100)}
                  </strong>
                </article>
              ))}
            </section>

            <div className="progress-actions">
              <Link
                href={
                  "/rescue?ids=" +
                  encodeURIComponent(rescueSet.map((item) => item.id).join(",")) +
                  "&step=0"
                }
                className="button button-primary"
              >
                <LifeBuoy size={18} />
                Rescue {rescueSet.length} words
                <ArrowRight size={17} />
              </Link>
              <Link href="/review" className="button button-secondary">
                Regular review
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={22} />
            <strong>No words need rescue right now.</strong>
            <span>Your current FSRS state does not show meaningful forgetting risk.</span>
          </div>
        )}
      </main>
    );
  }

  const byId = new Map(ranked.map((item) => [item.id, item]));
  const cards: Array<RescueSessionCard | null> = requestedIds.map((id) => {
    const item = byId.get(id);
    if (!item) return null;
    const exerciseType = selectReviewExerciseType(
      {
        recognition: item.recognition,
        meaningRecall: item.meaningRecall,
        production: item.production,
        contextualUsage: item.contextualUsage,
        mistakeTypes: item.lexeme.mistakes.map((mistake) => mistake.type),
      },
      [],
    );
    return {
      userVocabularyId: item.id,
      lemma: item.lexeme.lemma,
      article: item.lexeme.article,
      translations: item.lexeme.translations.filter((translation) =>
        isTranslationVisible(course.explanationLanguage, translation.language),
      ),
      exercise: buildExercise(exerciseType, item.lexeme, course.explanationLanguage),
      riskPercent: Math.round(item.risk.score * 100),
      reasons: item.risk.reasons.length
        ? item.risk.reasons
        : ["low confidence compared with stronger vocabulary"],
    };
  });
  const requestedStep = Number(query.step ?? 0);
  const initialStep = Number.isFinite(requestedStep)
    ? Math.min(cards.length, Math.max(0, Math.floor(requestedStep)))
    : 0;

  return <RescueSession cards={cards} initialStep={initialStep} />;
}
