import { connection } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getVocabularyRecommendations } from "@/lib/recommendations";
import { RefreshSemanticButton } from "./RecommendationActions";
import { RecommendationList } from "./RecommendationList";


export default async function RecommendationsPage() {
  await connection();
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

      <RecommendationList
        initialRecommendations={recommendations}
        translationPreference={user.preferredTranslation}
      />
    </main>
  );
}
