"use client";

import { useActionState } from "react";
import { WandSparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { createLexeme, type CreateLexemeState } from "./actions";

const initialState: CreateLexemeState = { status: "idle" };

export function AddLexemeForm() {
  const [state, action] = useActionState(createLexeme, initialState);

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="word">German word or lexical phrase</label>
        <input
          id="word"
          name="word"
          placeholder="z. B. sich interessieren für"
          autoCapitalize="none"
          autoComplete="off"
          required
        />
      </div>

      {state.status === "error" && state.message ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Analyzing with OpenAI…">
        <WandSparkles size={18} />
        Analyze and add
      </ActionButton>

      <p className="form-help">
        U-Vocab will extract both English and Persian meanings, grammar,
        patterns, and contextual examples.
      </p>
    </form>
  );
}
