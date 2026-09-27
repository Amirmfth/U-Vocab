"use client";

import { useActionState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  generateInsightAction,
  type InsightActionState,
} from "./actions";

const initialState: InsightActionState = { status: "idle" };

export function LexicalInsightPanel({
  lexemeId,
  hasInsight,
}: {
  lexemeId: string;
  hasInsight: boolean;
}) {
  const [state, action] = useActionState(generateInsightAction, initialState);

  return (
    <form action={action} className="insight-action">
      <input type="hidden" name="lexemeId" value={lexemeId} />
      {state.status === "success" ? (
        <StatusNotice tone="success">{state.message}</StatusNotice>
      ) : null}
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Generating context…">
        {hasInsight ? <RefreshCw size={18} /> : <Sparkles size={18} />}
        {hasInsight ? "Regenerate explanation" : "Generate AI explanation"}
      </ActionButton>
    </form>
  );
}
