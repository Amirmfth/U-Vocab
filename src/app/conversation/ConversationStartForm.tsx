"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Target } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import {
  createConversationSessionAction,
  type ConversationActionState,
} from "./actions";

const initialState: ConversationActionState = { status: "idle" };

export function ConversationStartForm({
  kind,
  collections,
}: {
  kind: "PRACTICE" | "MISSION";
  collections: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    createConversationSessionAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/conversation/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <form action={action} className="panel conversation-start-form">
      <input type="hidden" name="kind" value={kind} />

      <div className="field">
        <label htmlFor={kind + "-topic"}>Situation or topic <span className="muted">(optional)</span></label>
        <input
          id={kind + "-topic"}
          name="topic"
          placeholder={kind === "MISSION" ? "z. B. Arbeit, Wohnung, Reise" : "z. B. Alltag, Arbeit, Freizeit"}
        />
      </div>

      <div className="field">
        <label htmlFor={kind + "-collection-trigger"}>Prioritize collection</label>
        <ActivitySelect
          id={kind + "-collection"}
          name="collectionId"
          defaultValue="NONE"
          options={[
            { value: "NONE", label: "Adaptive weak vocabulary" },
            ...collections,
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor={kind + "-target-count"}>Target lexical units</label>
        <ActivitySelect
          id={kind + "-target-count"}
          name="targetCount"
          defaultValue="5"
          options={[
            { value: "3", label: "3 targets" },
            { value: "5", label: "5 targets" },
            { value: "7", label: "7 targets" },
          ]}
        />
      </div>

      {kind === "MISSION" ? (
        <label className="conversation-toggle">
          <input type="checkbox" name="revealTargets" />
          <span>
            <strong>Show target words during the mission</strong>
            <small>Leave off for a more secret-objective style challenge.</small>
          </span>
        </label>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel={kind === "MISSION" ? "Creating mission…" : "Preparing conversation…"}>
        {kind === "MISSION" ? <Target size={18} /> : <MessageCircle size={18} />}
        {kind === "MISSION" ? "Create mission" : "Start conversation"}
      </ActionButton>
    </form>
  );
}
