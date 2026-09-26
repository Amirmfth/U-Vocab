"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { evaluateWritingAction, type WritingActionState } from "../actions";

const initialState: WritingActionState = { status: "idle" };

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function WritingEditor({
  sessionId,
  initialDraft,
  targetWords,
}: {
  sessionId: string;
  initialDraft: string;
  targetWords: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [state, action] = useActionState(evaluateWritingAction, initialState);
  const words = useMemo(() => countWords(draft), [draft]);

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <form action={action} className="writing-editor">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="writing-editor-heading">
        <label htmlFor="writing-draft">Your response</label>
        <span>Write in German. You can revise freely before submitting.</span>
      </div>
      <textarea
        id="writing-draft"
        name="draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={18}
        placeholder="Schreibe deinen Text auf Deutsch…"
        autoComplete="off"
        aria-describedby="writing-word-count"
      />

      <div className="writing-editor-footer">
        <span id="writing-word-count" className={words < targetWords * 0.7 ? "is-under" : ""}>
          {words} of about {targetWords} words
        </span>

        <ActionButton pendingLabel="Evaluating writing…" disabled={words < 20}>
          <Send size={17} />
          Submit for evaluation
        </ActionButton>
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </form>
  );
}
