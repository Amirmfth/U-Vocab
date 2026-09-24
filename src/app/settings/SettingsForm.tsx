"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { TranslationLanguage } from "@prisma/client";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import {
  updateTranslationPreference,
  type SettingsState,
} from "./actions";

const initialState: SettingsState = { status: "idle" };

export function SettingsForm({
  preference,
  targetLevel,
}: {
  preference: TranslationLanguage;
  targetLevel: string;
}) {
  const [state, action] = useActionState(
    updateTranslationPreference,
    initialState,
  );

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="translation-trigger">Translation language</label>
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
        <label htmlFor="targetLevel-trigger">German target level</label>
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
        <small className="muted">
          AI explanations and guided lessons adapt to this level.
        </small>
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message ?? "Learning preferences saved."}
        </StatusNotice>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">
          {state.message ?? "Could not save these preferences."}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Saving…">
        <Save size={18} />
        Save preferences
      </ActionButton>
    </form>
  );
}
