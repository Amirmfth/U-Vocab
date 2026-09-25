import type { VocabularyRecommendation } from "./recommendations";

export function optimisticRemoveRecommendation(
  recommendations: VocabularyRecommendation[],
  lexemeId: string,
) {
  return recommendations.filter(
    (recommendation) => recommendation.lexemeId !== lexemeId,
  );
}
