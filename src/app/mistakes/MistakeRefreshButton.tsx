"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";
import {
  refreshMistakeEmbeddings,
  type MistakeActionState,
} from "./actions";

const initialState: MistakeActionState = { status: "idle" };

export function MistakeRefreshButton() {
  const [state, action] = useActionState(
    refreshMistakeEmbeddings,
    initialState,
  );
  const t = useTranslations();

  return (
    <div className="mistake-refresh [display:flex] [flex-direction:column] [gap:8px]">
      <form action={action}>
        <ActionButton
          variant="secondary"
          pendingLabel={t("mistakes.indexing")}
        >
          <Sparkles size={16} />
          {t("mistakes.refresh")}
        </ActionButton>
      </form>
      {state.status === "success" ? (
        <StatusNotice tone="success">{state.message}</StatusNotice>
      ) : null}
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
