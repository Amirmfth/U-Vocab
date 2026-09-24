import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getVocabularyRecommendations } from "@/lib/recommendations";
import { isTranslationVisible } from "@/lib/translations";
import {
  RecommendationActions,
  RefreshSemanticButton,
} from "./RecommendationActions";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const user = await getCurrentUser();
  const recommendations = await getVocabularyRecommendations(user.id, 24);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">PERSONALIZED</p>
        <h1>Recommendations</h1>
        <p className="page-description">
          Ranked from your lexical graph, topics, encounters, weak areas, target
          level, and semantic similarity. Known and dismissed vocabulary is excluded.
        </p>
      </section>

      <RefreshSemanticButton />

      {recommendations.length ? (
        <section className="recommendation-list">
          {recommendations.map((recommendation) => {
            const rationale = recommendation.reasons
              .slice(0, 3)
              .map((reason) => reason.label)
              .join("; ");

            return (
              <article className="recommendation-row" key={recommendation.lexemeId}>
                <div className="recommendation-copy">
                  <div className="word-meta">
                    <span className="badge">{recommendation.partOfSpeech}</span>
                    <span className="badge">
                      score {Math.round(recommendation.score * 100)}
                    </span>
                    {recommendation.similarity > 0 ? (
                      <span className="badge">
                        semantic {Math.round(recommendation.similarity * 100)}%
                      </span>
                    ) : null}
                  </div>

                  <h2>
                    {recommendation.article ? recommendation.article + " " : ""}
                    {recommendation.lemma}
                  </h2>

                  {isTranslationVisible(user.preferredTranslation, "en") &&
                  recommendation.english ? (
                    <p>{recommendation.english}</p>
                  ) : null}
                  {isTranslationVisible(user.preferredTranslation, "fa") &&
                  recommendation.persian ? (
                    <p className="rtl">{recommendation.persian}</p>
                  ) : null}

                  <div className="recommendation-reasons">
                    {recommendation.reasons.slice(0, 3).map((reason) => (
                      <span key={reason.label}>{reason.label}</span>
                    ))}
                  </div>
                </div>

                <RecommendationActions
                  lexemeId={recommendation.lexemeId}
                  rationale={rationale}
                />
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state">
          <Sparkles size={22} />
          <strong>No recommendations yet.</strong>
          <span>
            Add more vocabulary, reading encounters, topic packs, or refresh the
            semantic index.
          </span>
        </div>
      )}
    </main>
  );
}
