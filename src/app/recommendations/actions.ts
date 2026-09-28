"use server";

export type RecommendationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const disabledMessage = "Vocabulary recommendations are disabled.";

export async function addRecommendation(
  _previous: RecommendationActionState,
  _formData: FormData,
): Promise<RecommendationActionState> {
  return { status: "error", message: disabledMessage };
}

export async function dismissRecommendation(
  _previous: RecommendationActionState,
  _formData: FormData,
): Promise<RecommendationActionState> {
  return { status: "error", message: disabledMessage };
}

export async function refreshSemanticRecommendations(
  _previous: RecommendationActionState,
): Promise<RecommendationActionState> {
  return { status: "error", message: disabledMessage };
}
