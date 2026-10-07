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
    <form action={action} className="panel form-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:100%] [max-width:680px] [border-radius:18px]">
      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="uiLocale-trigger">
          <Languages size={17} aria-hidden="true" /> {t("settings.uiLanguage")}
        </label>
        <span className="muted [color:var(--text-muted)]">{t("settings.uiLanguageHelp")}</span>
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
