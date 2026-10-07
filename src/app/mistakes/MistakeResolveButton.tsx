"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";
import {
  resolveMistake,
  type MistakeActionState,
} from "./actions";

const initialState: MistakeActionState = { status: "idle" };

export function MistakeResolveButton({ mistakeId }: { mistakeId: string }) {
  const [state, action] = useActionState(resolveMistake, initialState);
  const t = useTranslations();

  if (state.status === "success") {
    return <StatusNotice tone="success">{state.message}</StatusNotice>;
  }

  return (
    <div className="mistake-resolve [display:flex] [flex-direction:column] [gap:7px]">
      <form action={action}>
        <input type="hidden" name="mistakeId" value={mistakeId} />
        <ActionButton variant="secondary" pendingLabel={t("mistakes.resolving")}>
          <Check size={16} />
          {t("mistakes.resolve")}
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
