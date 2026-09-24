"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { TranslationLanguage } from "@prisma/client";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { updateTranslationPreference, type SettingsState } from "./actions";

const initialState: SettingsState = { status: "idle" };

export function SettingsForm({ preference, targetLevel }: {
  preference: TranslationLanguage; targetLevel: string;
}) {
  const [state, action] = useActionState(updateTranslationPreference, initialState);

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="translation">Translation</label>
        <select id="translation" name="translation" defaultValue={preference}>
          <option value="ENGLISH">English</option>
          <option value="PERSIAN">Persian</option>
          <option value="BOTH">English + Persian</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="targetLevel">German level</label>
        <select id="targetLevel" name="targetLevel" defaultValue={targetLevel}>
          <option value="A1">A1 · Beginner</option>
          <option value="A2">A2 · Elementary</option>
          <option value="B1">B1 · Intermediate</option>
          <option value="B2">B2 · Upper intermediate</option>
          <option value="C1">C1 · Advanced</option>
          <option value="C2">C2 · Proficient</option>
        </select>
      </div>

      {state.status === "success" ? <StatusNotice tone="success">{state.message ?? "Preferences saved."}</StatusNotice> : null}
      {state.status === "error" ? <StatusNotice tone="error">{state.message ?? "Could not save preferences."}</StatusNotice> : null}

      <ActionButton pendingLabel="Saving…"><Save size={18} />Save</ActionButton>
    </form>
  );
}
