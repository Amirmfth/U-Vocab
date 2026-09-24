"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  recordReadingEncounters,
  type ReadingMutationState,
} from "../actions";

const initialState: ReadingMutationState = { status: "idle" };

export function RecordEncountersForm({ documentId }: { documentId: string }) {
  const [state, action] = useActionState(recordReadingEncounters, initialState);

  return (
    <div className="reading-action-stack">
      <form action={action}>
        <input type="hidden" name="documentId" value={documentId} />
        <ActionButton pendingLabel="Recording…">
          <CheckCircle2 size={17} />
          Mark as read
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
