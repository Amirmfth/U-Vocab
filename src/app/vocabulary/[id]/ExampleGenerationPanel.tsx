"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { generateExamplesAction, type InsightActionState } from "./actions";

const initialState: InsightActionState = { status: "idle" };

export function ExampleGenerationPanel({ lexemeId, hasExamples }: { lexemeId: string; hasExamples: boolean }) {
  const [state, action] = useActionState(generateExamplesAction, initialState);

  return (
    <form action={action} className="word-example-action">
      <input type="hidden" name="lexemeId" value={lexemeId} />
      <ActionButton pendingLabel="Generating examples…">
        <Sparkles size={17} /> {hasExamples ? "Replace examples" : "Generate examples"}
      </ActionButton>
      {state.status !== "idle" ? (
        <StatusNotice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </StatusNotice>
      ) : null}
    </form>
  );
}
