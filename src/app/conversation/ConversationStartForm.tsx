"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Target } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import {
  createConversationSessionAction,
  type ConversationActionState,
} from "./actions";

const initialState: ConversationActionState = { status: "idle" };

export function ConversationStartForm({
  initialMode = "PRACTICE",
}: {
  initialMode?: "PRACTICE" | "MISSION";
}) {
  const [kind, setKind] = useState(initialMode);
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action] = useActionState(
    createConversationSessionAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/conversation/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <form action={action} className="panel conversation-start-form [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[620px]:[&_>_.field:first-of-type]:[grid-column:1_/_-1] min-[620px]:[&_>_.conversation-toggle]:[grid-column:1_/_-1] min-[620px]:[&_>_.status-notice]:[grid-column:1_/_-1] min-[620px]:[&_>_.button]:[grid-column:1_/_-1] [border-radius:18px] [&.loading-hub-form]:[display:flex] [&.loading-hub-form]:[flex-direction:column] min-[620px]:[&.loading-hub-form]:[display:grid] min-[620px]:[&.loading-hub-form]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[620px]:[&.loading-hub-form_>_.field:first-child]:[grid-column:1_/_-1] min-[620px]:[&.loading-hub-form_>_.loading-form-submit]:[grid-column:1_/_-1]">
      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="conversation-mode-trigger">{t("conversation.mode")}</label>
        <ActivitySelect
          id="conversation-mode"
          name="kind"
          defaultValue={initialMode}
          onValueChange={(value) => setKind(value === "MISSION" ? "MISSION" : "PRACTICE")}
          options={[
            {
              value: "PRACTICE",
              label: t("conversation.practiceMode"),
              description: t("conversation.practiceDescription"),
            },
            {
              value: "MISSION",
              label: t("conversation.missionMode"),
              description: t("conversation.missionDescription"),
            },
          ]}
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor={kind + "-topic"}>
          {t("conversation.topic")}{" "}
          <span className="muted [color:var(--text-muted)]">({t("reading.optional")})</span>
        </label>
        <input
          id={kind + "-topic"}
          name="topic"
          placeholder={
            kind === "MISSION"
              ? t("conversation.topicMissionPlaceholder")
              : t("conversation.topicPracticePlaceholder")
          }
          dir="auto"
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor={kind + "-target-count"}>{t("conversation.targets")}</label>
        <ActivitySelect
          id={kind + "-target-count"}
          name="targetCount"
          defaultValue="5"
          options={[3, 5, 7].map((count) => ({
            value: String(count),
            label: t("conversation.targetCount", {
              count: formatNumber(locale, count),
            }),
          }))}
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor={kind + "-tone-trigger"}>{t("conversation.tone")}</label>
        <ActivitySelect
          id={kind + "-tone"}
          name="tone"
          defaultValue="FRIENDLY"
          options={[
            {
              value: "FRIENDLY",
              label: t("conversation.friendly"),
              description: t("conversation.friendlyHelp"),
            },
            {
              value: "PROFESSIONAL",
              label: t("conversation.professional"),
              description: t("conversation.professionalHelp"),
            },
            {
              value: "PLAYFUL",
              label: t("conversation.playful"),
              description: t("conversation.playfulHelp"),
            },
            {
              value: "DIRECT",
              label: t("conversation.direct"),
              description: t("conversation.directHelp"),
            },
            {
              value: "SUPPORTIVE",
              label: t("conversation.supportive"),
              description: t("conversation.supportiveHelp"),
            },
          ]}
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor={kind + "-formality-trigger"}>{t("conversation.formality")}</label>
        <ActivitySelect
          id={kind + "-formality"}
          name="formality"
          defaultValue="NEUTRAL"
          options={[
            {
              value: "CASUAL",
              label: t("conversation.casual"),
              description: t("conversation.casualHelp"),
            },
            {
              value: "NEUTRAL",
              label: t("conversation.contextual"),
              description: t("conversation.contextualHelp"),
            },
            {
              value: "FORMAL",
              label: t("conversation.formal"),
              description: t("conversation.formalHelp"),
            },
          ]}
        />
      </div>

      {kind === "MISSION" ? (
        <label className="conversation-toggle [min-height:54px] [display:flex] [align-items:flex-start] [gap:10px] [padding:11px_0] [cursor:pointer] [&_input]:[width:18px] [&_input]:[height:18px] [&_input]:[margin-top:2px] [&_span]:[display:flex] [&_span]:[flex-direction:column] [&_span]:[gap:3px] [&_small]:[color:var(--text-muted)] [&_small]:[line-height:1.4]">
          <input type="checkbox" name="revealTargets" />
          <span>
            <strong>{t("conversation.showTargets")}</strong>
            <small>{t("conversation.showTargetsHelp")}</small>
          </span>
        </label>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton
        pendingLabel={
          kind === "MISSION"
            ? t("conversation.creatingMission")
            : t("conversation.preparing")
        }
      >
        {kind === "MISSION" ? <Target size={18} /> : <MessageCircle size={18} />}
        {kind === "MISSION" ? t("conversation.createMission") : t("conversation.start")}
      </ActionButton>
    </form>
  );
}
