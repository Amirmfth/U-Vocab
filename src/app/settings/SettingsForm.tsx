"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { CefrLevel, TranslationLanguage } from "@prisma/client";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { useTranslations } from "@/i18n/client";
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
  const t = useTranslations();

  const levels = [
    { label: `A1 · ${t("settings.beginner")}`, value: "A1" },
    { label: `A2 · ${t("settings.elementary")}`, value: "A2" },
    { label: `B1 · ${t("settings.intermediate")}`, value: "B1" },
    { label: `B2 · ${t("settings.upperIntermediate")}`, value: "B2" },
    { label: `C1 · ${t("settings.advanced")}`, value: "C1" },
    { label: `C2 · ${t("settings.proficient")}`, value: "C2" },
  ];

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="translation-trigger">{t("settings.translation")}</label>
        <ActivitySelect
          defaultValue={preference}
          id="translation"
          name="translation"
          options={[
            { label: t("common.english"), value: "ENGLISH" },
            { label: t("common.persian"), value: "PERSIAN" },
            { label: t("common.englishPersian"), value: "BOTH" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="currentLevel-trigger">{t("settings.currentGermanLevel")}</label>
        <span className="muted">{t("settings.currentLevelHelp")}</span>
        <ActivitySelect
          defaultValue={currentLevel}
          id="currentLevel"
          name="currentLevel"
          options={levels}
        />
      </div>

      <div className="field">
        <label htmlFor="targetLevel-trigger">{t("settings.targetGermanLevel")}</label>
        <span className="muted">{t("settings.targetLevelHelp")}</span>
        <ActivitySelect
          defaultValue={targetLevel}
          id="targetLevel"
          name="targetLevel"
          options={levels}
        />
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message ?? t("settings.preferencesSaved")}
        </StatusNotice>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">
          {state.message ?? t("settings.preferencesSaveError")}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel={t("common.saving")}>
        <Save size={18} />
        {t("common.save")}
      </ActionButton>
    </form>
  );
}
