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
  languageLabel,
}: {
  preference: TranslationLanguage;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  languageLabel: string;
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
    <form action={action} className="panel form-panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 w-full max-w-uv-74487d394e rounded-exact-18px">
      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <label htmlFor="currentLevel-trigger">{t("settings.currentLanguageLevel", { language: languageLabel })}</label>
        <span className="muted text-uv-text-muted">{t("settings.currentLevelHelp")}</span>
        <ActivitySelect
          defaultValue={currentLevel}
          id="currentLevel"
          name="currentLevel"
          options={levels}
        />
      </div>

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <label htmlFor="targetLevel-trigger">{t("settings.targetLanguageLevel", { language: languageLabel })}</label>
        <span className="muted text-uv-text-muted">{t("settings.targetLevelHelp")}</span>
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
