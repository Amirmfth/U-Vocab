"use client";

import { useActionState } from "react";
import { Clock3 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";
import {
  scheduleTeachReviewAction,
  type InsightActionState,
} from "../actions";

const initialState: InsightActionState = { status: "idle" };

export function ScheduleReviewForm({ lexemeId }: { lexemeId: string }) {
  const [state, action] = useActionState(scheduleTeachReviewAction, initialState);
  const t = useTranslations();

  return (
    <form action={action}>
      <input type="hidden" name="lexemeId" value={lexemeId} />
      <ActionButton variant="secondary" pendingLabel={t("word.lesson.scheduling")}>
        <Clock3 size={18} />
        {t("word.lesson.addQueue")}
      </ActionButton>
      {state.status === "success" ? (
        <StatusNotice tone="success">{state.message}</StatusNotice>
      ) : null}
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </form>
  );
}
