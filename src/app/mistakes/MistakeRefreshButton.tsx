"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  refreshMistakeEmbeddings,
  type MistakeActionState,
} from "./actions";

const initialState: MistakeActionState = { status: "idle" };

export function MistakeRefreshButton() {
  const [state, action] = useActionState(
    refreshMistakeEmbeddings,
    initialState,
  );

  return (
    <div className="mistake-refresh">
      <form action={action}>
        <ActionButton variant="secondary" pendingLabel="Indexing mistakes…">
          <Sparkles size={16} />
          Refresh semantic groups
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
