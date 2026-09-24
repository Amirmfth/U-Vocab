import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LifeBuoy } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getRescueWords } from "@/lib/rescue";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
import { isTranslationVisible } from "@/lib/translations";
import { RescueCard } from "./RescueCard";

export const dynamic = "force-dynamic";

export default async function RescuePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; step?: string }>;
}) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const ranked = await getRescueWords(user.id, 100);

  if (!query.ids) {
    const top = ranked.slice(0, 20);
    const rescueSet = top.slice(0, 10);

    return (
      <main className="page">
        <section className="page-header compact">
          <Link href="/progress" className="back-link">
            <ArrowLeft size={16} />
            Progress
          </Link>
          <p className="eyebrow">RETENTION</p>
          <h1>Rescue words</h1>
          <p className="page-description">
            Ranked from current FSRS retrievability, overdue status, recent failed retrievals, and stability.
          </p>
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
                        {item.lexeme.article ? item.lexeme.article + " " : ""}
                        {item.lexeme.lemma}
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

  const requestedIds = query.ids.split(",").filter(Boolean);
  const stableIds = requestedIds;
  const step = Math.max(0, Number(query.step ?? 0) || 0);
  const currentId = stableIds[step];
  const current = ranked.find((item) => item.id === currentId);

  if (!current) {
    return (
      <main className="page focus-page">
        <section className="page-header compact">
          <Link href="/progress" className="back-link">
            <ArrowLeft size={16} />
            Progress
          </Link>
          <CheckCircle2 size={28} className="rescue-complete-icon" />
          <h1>Rescue complete</h1>
          <p className="page-description">
            The selected words have been reviewed and their learner state has been updated.
          </p>
          <div className="hero-actions">
            <Link href="/rescue" className="button button-primary">
              Back to rescue words
            </Link>
            <Link href="/review" className="button button-secondary">
              Regular review
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const exerciseType = selectReviewExerciseType(
    {
      recognition: current.recognition,
      meaningRecall: current.meaningRecall,
      production: current.production,
      contextualUsage: current.contextualUsage,
      mistakeTypes: current.lexeme.mistakes.map((mistake) => mistake.type),
    },
    [],
  );

  const exercise = buildExercise(
    exerciseType,
    current.lexeme,
    user.preferredTranslation,
  );

  const translations = current.lexeme.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  return (
    <main className="page focus-page">
      <section className="focus-meta">
        <Link href="/rescue" className="back-link">
          <ArrowLeft size={16} />
          Rescue words
        </Link>
        <span>
          {step + 1} / {stableIds.length}
        </span>
      </section>

      <RescueCard
        userVocabularyId={current.id}
        ids={stableIds.join(",")}
        step={step}
        lemma={current.lexeme.lemma}
        article={current.lexeme.article}
        translations={translations}
        exercise={exercise}
        riskPercent={Math.round(current.risk.score * 100)}
        reasons={
          current.risk.reasons.length
            ? current.risk.reasons
            : ["low confidence compared with stronger vocabulary"]
        }
      />
    </main>
  );
}
