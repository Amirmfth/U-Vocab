"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Plus, RotateCcw, X } from "lucide-react";
import type { TranslationLanguage } from "@prisma/client";
import type { VocabularyRecommendation } from "@/lib/recommendations";
import { optimisticRemoveRecommendation } from "@/lib/recommendation-query";
import { startOperation } from "@/lib/performance";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import {
  addRecommendation,
  dismissRecommendation,
  type RecommendationActionState,
} from "./actions";

const idle: RecommendationActionState = { status: "idle" };

type MutationInput = {
  action: "add" | "dismiss";
  recommendation: VocabularyRecommendation;
  rationale: string;
};

function recommendationForm(input: MutationInput) {
  const formData = new FormData();
  formData.set("lexemeId", input.recommendation.lexemeId);
  formData.set("rationale", input.rationale);
  return formData;
}

export function RecommendationList({
  initialRecommendations,
  translationPreference,
}: {
  initialRecommendations: VocabularyRecommendation[];
  translationPreference: TranslationLanguage;
}) {
  const [recommendations, setRecommendations] = useState(
    initialRecommendations,
  );

  useEffect(() => {
    setRecommendations(initialRecommendations);
  }, [initialRecommendations]);

  const mutation = useMutation({
    mutationFn: async (input: MutationInput) => {
      const formData = recommendationForm(input);
      const result =
        input.action === "add"
          ? await addRecommendation(idle, formData)
          : await dismissRecommendation(idle, formData);

      if (result.status === "error") {
        throw new Error(result.message ?? "Could not update recommendation.");
      }
      return result;
    },
    onMutate: (input) => {
      const perf = startOperation("interaction.recommendation_action", {
        action: input.action,
        optimistic: true,
      });
      const previous = recommendations;
      setRecommendations((current) =>
        optimisticRemoveRecommendation(
          current,
          input.recommendation.lexemeId,
        ),
      );
      return { previous, perf };
    },
    onError: (error, _input, context) => {
      if (context?.previous) setRecommendations(context.previous);
      context?.perf.fail(error, { rolledBack: true });
    },
    onSuccess: (_result, _input, context) => {
      context?.perf.success({ rolledBack: false });
    },
  });

  if (!recommendations.length && !mutation.isError) {
    return (
      <div className="empty-state">
        <strong>No recommendations yet.</strong>
        <span>
          Add more vocabulary, reading encounters, topic packs, or refresh the
          semantic index.
        </span>
      </div>
    );
  }

  return (
    <>
      {mutation.isError ? (
        <div className="optimistic-error" role="alert">
          <AlertCircle size={17} />
          <span>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Could not update this recommendation."}
          </span>
          <button
            className="text-button"
            onClick={() => {
              if (mutation.variables) mutation.mutate(mutation.variables);
            }}
            type="button"
          >
            <RotateCcw size={15} />
            Retry
          </button>
        </div>
      ) : null}

      <section
        className="recommendation-list"
        aria-busy={mutation.isPending}
      >
        {recommendations.map((recommendation) => {
          const rationale = recommendation.reasons
            .slice(0, 3)
            .map((reason) => reason.label)
            .join("; ");

          return (
            <article
              className="recommendation-row"
              key={recommendation.lexemeId}
            >
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

                <h2>{formatLexemeLabel(recommendation)}</h2>

                {isTranslationVisible(translationPreference, "en") &&
                recommendation.english ? (
                  <p>{recommendation.english}</p>
                ) : null}
                {isTranslationVisible(translationPreference, "fa") &&
                recommendation.persian ? (
                  <p className="rtl">{recommendation.persian}</p>
                ) : null}

                <div className="recommendation-reasons">
                  {recommendation.reasons.slice(0, 3).map((reason) => (
                    <span key={reason.label}>{reason.label}</span>
                  ))}
                </div>
              </div>

              <div className="recommendation-actions">
                <button
                  className="button button-primary"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      action: "add",
                      recommendation,
                      rationale,
                    })
                  }
                  type="button"
                >
                  <Plus size={17} />
                  Add
                </button>
                <button
                  className="button button-secondary"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      action: "dismiss",
                      recommendation,
                      rationale,
                    })
                  }
                  type="button"
                >
                  <X size={17} />
                  Dismiss
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
