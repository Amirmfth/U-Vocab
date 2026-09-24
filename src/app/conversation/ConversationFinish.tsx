"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  completeConversationAction,
  replayConversationAction,
  type ConversationActionState,
} from "./actions";

const initialState: ConversationActionState = { status: "idle" };

export function ConversationFinish({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, action] = useActionState(
    completeConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <div className="conversation-finish">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton pendingLabel="Evaluating session…">
          <CheckCircle2 size={17} />
          Finish & evaluate
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}

export function ConversationReplay({
  sessionId,
  kind,
}: {
  sessionId: string;
  kind: "PRACTICE" | "MISSION";
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    replayConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/conversation/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <div className="conversation-replay">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton variant="secondary" pendingLabel="Preparing replay…">
          <RotateCcw size={17} />
          Replay
        </ActionButton>
      </form>
      <Link
        href={kind === "MISSION" ? "/missions" : "/conversation"}
        className="button button-primary"
      >
        New {kind === "MISSION" ? "mission" : "conversation"}
      </Link>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
