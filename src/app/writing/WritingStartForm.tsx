"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { createWritingSessionAction, type WritingActionState } from "./actions";

const initialState: WritingActionState = { status: "idle" };

export function WritingStartForm({
  collections,
}: {
  collections: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(createWritingSessionAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/writing/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <form action={action} className="panel writing-start-form">
      <div className="field">
        <label htmlFor="writing-mode-trigger">Mode</label>
        <ActivitySelect
          id="writing-mode"
          name="mode"
          defaultValue="GUIDED"
          options={[
            { value: "GUIDED", label: "Guided vocabulary" },
            { value: "OPEN", label: "Open writing" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="writing-level-trigger">Level</label>
        <ActivitySelect
          id="writing-level"
          name="level"
          defaultValue="B2"
          options={["A1","A2","B1","B2","C1","C2"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>

      <div className="field">
        <label htmlFor="writing-type-trigger">Writing type</label>
        <ActivitySelect
          id="writing-type"
          name="taskType"
          defaultValue="formal_email"
          options={[
            { value: "formal_email", label: "Formal email" },
            { value: "informal_email", label: "Informal email" },
            { value: "opinion", label: "Opinion text" },
            { value: "essay", label: "Essay" },
            { value: "complaint", label: "Complaint / request" },
            { value: "report", label: "Short report" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="writing-length-trigger">Target length</label>
        <ActivitySelect
          id="writing-length"
          name="targetWords"
          defaultValue="120"
          options={[
            { value: "120", label: "~120 words" },
            { value: "180", label: "~180 words" },
            { value: "CUSTOM", label: "Custom length" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="writing-custom-words">Custom word target</label>
        <input
          id="writing-custom-words"
          name="customWords"
          type="number"
          min="60"
          max="500"
          defaultValue="150"
        />
      </div>

      <div className="field writing-topic-field">
        <label htmlFor="writing-topic">Topic</label>
        <input id="writing-topic" name="topic" placeholder="z. B. Homeoffice, Reisen, Wohnen" />
      </div>

      <div className="field">
        <label htmlFor="writing-collection-trigger">Guided collection</label>
        <ActivitySelect
          id="writing-collection"
          name="collectionId"
          defaultValue="NONE"
          options={[
            { value: "NONE", label: "Adaptive weak vocabulary" },
            ...collections,
          ]}
        />
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Preparing your writing task…">
        <PenLine size={17} />
        Create writing task
      </ActionButton>
    </form>
  );
}
