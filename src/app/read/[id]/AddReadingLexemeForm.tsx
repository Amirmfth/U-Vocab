"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  addReadingLexeme,
  type ReadingMutationState,
} from "../actions";

const initialState: ReadingMutationState = { status: "idle" };

export function AddReadingLexemeForm({
  documentId,
  lexemeId,
}: {
  documentId: string;
  lexemeId: string;
}) {
  const [state, action] = useActionState(addReadingLexeme, initialState);

  return (
    <div className="reading-action-stack">
      <form action={action}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="lexemeId" value={lexemeId} />
        <ActionButton pendingLabel="Adding…">
          <Plus size={17} />
          Add to vocabulary
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
