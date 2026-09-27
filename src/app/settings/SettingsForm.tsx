"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { CefrLevel, TranslationLanguage } from "@prisma/client";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { updateTranslationPreference, type SettingsState } from "./actions";

const initialState: SettingsState = { status: "idle" };

export function SettingsForm({
  preference,
  currentLevel,
  targetLevel,
}: {
  preference: TranslationLanguage;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
}) {
  const [state, action] = useActionState(updateTranslationPreference, initialState);

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="translation-trigger">Translation</label>
        <ActivitySelect
          defaultValue={preference}
          id="translation"
          name="translation"
          options={[
            { label: "English", value: "ENGLISH" },
            { label: "Persian", value: "PERSIAN" },
            { label: "English + Persian", value: "BOTH" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="currentLevel-trigger">Current German level</label>
        <span className="muted">Used to avoid starting you at beginner grammar. U-Vocab will refine this from real learning evidence.</span>
        <ActivitySelect
          defaultValue={currentLevel}
          id="currentLevel"
          name="currentLevel"
          options={[
            { label: "A1 · Beginner", value: "A1" },
            { label: "A2 · Elementary", value: "A2" },
            { label: "B1 · Intermediate", value: "B1" },
            { label: "B2 · Upper intermediate", value: "B2" },
            { label: "C1 · Advanced", value: "C1" },
            { label: "C2 · Proficient", value: "C2" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="targetLevel-trigger">Target German level</label>
        <span className="muted">Your learning destination. Recommendations may gradually stretch toward this level.</span>
        <ActivitySelect
          defaultValue={targetLevel}
          id="targetLevel"
          name="targetLevel"
          options={[
            { label: "A1 · Beginner", value: "A1" },
            { label: "A2 · Elementary", value: "A2" },
            { label: "B1 · Intermediate", value: "B1" },
            { label: "B2 · Upper intermediate", value: "B2" },
            { label: "C1 · Advanced", value: "C1" },
            { label: "C2 · Proficient", value: "C2" },
          ]}
        />
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message ?? "Preferences saved."}
        </StatusNotice>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">
          {state.message ?? "Could not save preferences."}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Saving…">
        <Save size={18} />
        Save
      </ActionButton>
    </form>
  );
}
