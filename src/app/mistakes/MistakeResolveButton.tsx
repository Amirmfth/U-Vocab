"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  resolveMistake,
  type MistakeActionState,
} from "./actions";

const initialState: MistakeActionState = { status: "idle" };

export function MistakeResolveButton({ mistakeId }: { mistakeId: string }) {
  const [state, action] = useActionState(resolveMistake, initialState);

  if (state.status === "success") {
    return <StatusNotice tone="success">{state.message}</StatusNotice>;
  }

  return (
    <div className="mistake-resolve">
      <form action={action}>
        <input type="hidden" name="mistakeId" value={mistakeId} />
        <ActionButton variant="secondary" pendingLabel="Resolving…">
          <Check size={16} />
          Resolve
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
