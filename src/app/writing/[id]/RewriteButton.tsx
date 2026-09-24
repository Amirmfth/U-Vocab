"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { createRewriteAction, type WritingActionState } from "../actions";

const initialState: WritingActionState = { status: "idle" };

export function RewriteButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, action] = useActionState(createRewriteAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/writing/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <div className="writing-rewrite">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton variant="secondary" pendingLabel="Preparing rewrite…">
          <RotateCcw size={17} />
          Rewrite this task
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
