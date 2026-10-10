"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";
import { generateExamplesAction, type InsightActionState } from "./actions";

const initialState: InsightActionState = { status: "idle" };

export function ExampleGenerationPanel({
  lexemeId,
  hasExamples,
}: {
  lexemeId: string;
  hasExamples: boolean;
}) {
  const [state, action] = useActionState(generateExamplesAction, initialState);
  const t = useTranslations();

  return (
    <form action={action} className="word-example-action items-start">
      <input type="hidden" name="lexemeId" value={lexemeId} />
      <ActionButton pendingLabel={t("word.generatingExamples")}>
        <Sparkles size={17} />
        {hasExamples ? t("word.replaceExamples") : t("word.generateExamples")}
      </ActionButton>
      {state.status !== "idle" ? (
        <StatusNotice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </StatusNotice>
      ) : null}
    </form>
  );
}
