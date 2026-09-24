import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
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

  const requestedIds = query.ids
    ? query.ids.split(",").filter(Boolean)
    : ranked.slice(0, 10).map((item) => item.id);

  const stableIds = requestedIds.filter((id) =>
    ranked.some((item) => item.id === id),
  );
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
          <h1>{stableIds.length ? "Rescue complete" : "No rescue words"}</h1>
          <p className="page-description">
            {stableIds.length
              ? "The selected words have been reviewed and their learner state has been updated."
              : "No vocabulary currently meets the deterministic at-risk threshold."}
          </p>
          <div className="hero-actions">
            <Link href="/progress" className="button button-primary">
              Back to progress
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
        <Link href="/progress" className="back-link">
          <ArrowLeft size={16} />
          Progress
        </Link>
        <span>
          Rescue {step + 1} / {stableIds.length}
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
