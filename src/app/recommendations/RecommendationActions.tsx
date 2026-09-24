"use client";

import { useActionState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  addRecommendation,
  dismissRecommendation,
  type RecommendationActionState,
} from "./actions";

const initialState: RecommendationActionState = { status: "idle" };

export function RecommendationActions({
  lexemeId,
  rationale,
}: {
  lexemeId: string;
  rationale: string;
}) {
  const [addState, addAction] = useActionState(addRecommendation, initialState);
  const [dismissState, dismissAction] = useActionState(
    dismissRecommendation,
    initialState,
  );

  if (addState.status === "success" || dismissState.status === "success") {
    return (
      <StatusNotice tone="success">
        {addState.message ?? dismissState.message}
      </StatusNotice>
    );
  }

  return (
    <div className="recommendation-actions">
      <form action={addAction}>
        <input type="hidden" name="lexemeId" value={lexemeId} />
        <input type="hidden" name="rationale" value={rationale} />
        <ActionButton pendingLabel="Adding…">
          <Plus size={17} />
          Add
        </ActionButton>
      </form>
      <form action={dismissAction}>
        <input type="hidden" name="lexemeId" value={lexemeId} />
        <input type="hidden" name="rationale" value={rationale} />
        <ActionButton variant="secondary" pendingLabel="Dismissing…">
          <X size={17} />
          Dismiss
        </ActionButton>
      </form>
      {addState.status === "error" ? (
        <StatusNotice tone="error">{addState.message}</StatusNotice>
      ) : null}
      {dismissState.status === "error" ? (
        <StatusNotice tone="error">{dismissState.message}</StatusNotice>
      ) : null}
    </div>
  );
}

export function RefreshSemanticButton() {
  const [state, action] = useActionState(
    async (_previous: RecommendationActionState) => {
      const { refreshSemanticRecommendations } = await import("./actions");
      return refreshSemanticRecommendations(_previous);
    },
    initialState,
  );

  return (
    <div className="recommendation-refresh">
      <form action={action}>
        <ActionButton variant="secondary" pendingLabel="Indexing vocabulary…">
          <Sparkles size={17} />
          Refresh semantic ranking
        </ActionButton>
      </form>
      {state.status === "success" ? (
        <StatusNotice tone="success">{state.message}</StatusNotice>
      ) : null}
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
