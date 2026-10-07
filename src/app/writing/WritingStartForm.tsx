"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { createWritingSessionAction, type WritingActionState } from "./actions";

const initialState: WritingActionState = { status: "idle" };

export function WritingStartForm({
  defaultLevel,
}: {
  defaultLevel: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(createWritingSessionAction, initialState);
  const [targetLength, setTargetLength] = useState("120");
  const { locale, t } = useI18n();

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/writing/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <form action={action} className="panel writing-start-form [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] min-[620px]:[&_>_.status-notice]:[grid-column:1_/_-1] min-[620px]:[&_>_.button]:[grid-column:1_/_-1] [border-radius:18px] [padding:15px] [&.loading-hub-form]:[display:flex] [&.loading-hub-form]:[flex-direction:column] min-[940px]:[&.loading-hub-form]:[display:grid] min-[940px]:[&.loading-hub-form]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[940px]:[&.loading-hub-form_>_*]:[grid-column:1_/_-1]">
      <div className="writing-settings-row [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px]">
        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
          <label htmlFor="writing-mode-trigger">{t("writing.mode")}</label>
          <ActivitySelect
            id="writing-mode"
            name="mode"
            defaultValue="GUIDED"
            options={[
              { value: "GUIDED", label: t("writing.guided") },
              { value: "OPEN", label: t("writing.open") },
            ]}
          />
        </div>

        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
          <label htmlFor="writing-level-trigger">{t("writing.level")}</label>
          <ActivitySelect
            id="writing-level"
            name="level"
            defaultValue={defaultLevel}
            options={["A1", "A2", "B1", "B2", "C1", "C2"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>
      </div>

      <div className="writing-settings-row [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px]">
        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
          <label htmlFor="writing-type-trigger">{t("writing.type")}</label>
          <ActivitySelect
            id="writing-type"
            name="taskType"
            defaultValue="formal_email"
            options={[
              { value: "formal_email", label: t("writing.formalEmail") },
              { value: "informal_email", label: t("writing.informalEmail") },
              { value: "opinion", label: t("writing.opinion") },
              { value: "essay", label: t("writing.essay") },
              { value: "complaint", label: t("writing.complaint") },
              { value: "report", label: t("writing.report") },
            ]}
          />
        </div>

        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
          <label htmlFor="writing-length-trigger">{t("writing.targetLength")}</label>
          <ActivitySelect
            id="writing-length"
            name="targetWords"
            defaultValue="120"
            onValueChange={setTargetLength}
            options={[
              {
                value: "120",
                label: t("writing.wordsApprox", { count: formatNumber(locale, 120) }),
              },
              {
                value: "180",
                label: t("writing.wordsApprox", { count: formatNumber(locale, 180) }),
              },
              { value: "CUSTOM", label: t("writing.customLength") },
            ]}
          />
        </div>
      </div>

      {targetLength === "CUSTOM" ? (
        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
          <label htmlFor="writing-custom-words">{t("writing.customTarget")}</label>
          <input
            id="writing-custom-words"
            name="customWords"
            type="number"
            min="60"
            max="500"
            defaultValue="150"
          />
        </div>
      ) : null}

      <div className="field writing-topic-field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560] [grid-column:1_/_-1]">
        <label htmlFor="writing-topic">{t("writing.topic")}</label>
        <input
          id="writing-topic"
          name="topic"
          placeholder={t("writing.topicPlaceholder")}
          dir="auto"
        />
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel={t("writing.preparing")}>
        <PenLine size={17} />
        {t("writing.create")}
      </ActionButton>
    </form>
  );
}
