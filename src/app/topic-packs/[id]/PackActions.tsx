"use client";

import { useActionState } from "react";
import { LibraryBig } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  addPackToVocabulary,
  type PackMutationState,
} from "../actions";

const initialState: PackMutationState = { status: "idle" };

export function PackActions({ packId }: { packId: string }) {
  const [state, action] = useActionState(addPackToVocabulary, initialState);

  return (
    <div className="pack-global-action">
      <form action={action}>
        <input type="hidden" name="packId" value={packId} />
        <ActionButton variant="secondary" pendingLabel="Adding vocabulary…">
          <LibraryBig size={18} />
          Add all to vocabulary
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
