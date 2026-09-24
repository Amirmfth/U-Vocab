"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  removePackItem,
  type PackMutationState,
} from "../actions";

const initialState: PackMutationState = { status: "idle" };

export function PackItemActions({ itemId }: { itemId: string }) {
  const [state, action] = useActionState(removePackItem, initialState);

  return (
    <div className="pack-item-action">
      <form action={action}>
        <input type="hidden" name="itemId" value={itemId} />
        <ActionButton variant="secondary" pendingLabel="Removing…">
          <Trash2 size={16} />
          Remove
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
