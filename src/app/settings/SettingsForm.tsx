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
    <form action={action} className="panel form-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:100%] [max-width:680px] [border-radius:18px]">
      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="currentLevel-trigger">{t("settings.currentLanguageLevel", { language: languageLabel })}</label>
        <span className="muted [color:var(--text-muted)]">{t("settings.currentLevelHelp")}</span>
        <ActivitySelect
          defaultValue={currentLevel}
          id="currentLevel"
          name="currentLevel"
          options={levels}
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="targetLevel-trigger">{t("settings.targetLanguageLevel", { language: languageLabel })}</label>
        <span className="muted [color:var(--text-muted)]">{t("settings.targetLevelHelp")}</span>
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
