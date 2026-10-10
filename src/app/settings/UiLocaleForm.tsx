"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Languages, Save } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { useTranslations } from "@/i18n/client";
import type { UiLocale } from "@/i18n/config";
import { updateUiLocale, type SettingsState } from "./actions";

const initialState: SettingsState = { status: "idle" };

export function UiLocaleForm({ locale }: { locale: UiLocale }) {
  const [state, action] = useActionState(updateUiLocale, initialState);
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <form action={action} className="panel form-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 w-full max-w-uv-74487d394e rounded-uv-r6d27d54c6c">
      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
        <label htmlFor="uiLocale-trigger">
          <Languages size={17} aria-hidden="true" /> {t("settings.uiLanguage")}
        </label>
        <span className="muted text-uv-text-muted">{t("settings.uiLanguageHelp")}</span>
        <ActivitySelect
          defaultValue={locale}
          id="uiLocale"
          name="uiLocale"
          options={[
            { label: "English", value: "en" },
            { label: "فارسی", value: "fa" },
          ]}
        />
      </div>

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message ?? t("settings.interfaceSaved")}
        </StatusNotice>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">
          {state.message ?? t("settings.interfaceSaveError")}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel={t("common.saving")}>
        <Save size={18} />
        {t("common.save")}
      </ActionButton>
    </form>
  );
}
