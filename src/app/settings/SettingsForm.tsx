"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { TranslationLanguage } from "@prisma/client";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  updateTranslationPreference,
  type SettingsState,
} from "./actions";

const initialState: SettingsState = { status: "idle" };

export function SettingsForm({
  preference,
}: {
  preference: TranslationLanguage;
}) {
  const [state, action] = useActionState(
    updateTranslationPreference,
    initialState,
  );

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="translation">Translation language</label>
        <select
          id="translation"
          name="translation"
          defaultValue={preference}
        >
          <option value="ENGLISH">English</option>
          <option value="PERSIAN">Persian</option>
          <option value="BOTH">English + Persian</option>
        </select>
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">Translation preference saved.</StatusNotice>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">
          {state.message ?? "Could not save this preference."}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Saving…">
        <Save size={18} />
        Save preference
      </ActionButton>
    </form>
  );
}
