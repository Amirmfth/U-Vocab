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
    <form action={action} className="panel conversation-start-form border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 uv-min620:grid uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min620:in-field-first-of-type:grid-column-1-1 uv-min620:in-conversation-toggle:grid-column-1-1 uv-min620:in-status-notice:grid-column-1-1 uv-min620:in-button:grid-column-1-1 rounded-exact-18px in-loading-hub-form:flex in-loading-hub-form:flex-col uv-min620:in-loading-hub-form:grid uv-min620:in-loading-hub-form:grid-template-columns-repeat-2-minmax-0-1fr uv-min620:in-loading-hub-form-field-first-child:grid-column-1-1 uv-min620:in-loading-hub-form-loading-form-submit:grid-column-1-1">
      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <label htmlFor={kind + "-topic"}>
          {t("conversation.topic")}{" "}
          <span className="muted text-uv-text-muted">({t("reading.optional")})</span>
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

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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
        <label className="conversation-toggle min-h-13.5 flex items-start gap-2.5 padding-11px-0 cursor-pointer in-input:w-4.5 in-input:h-4.5 in-input:mt-0.5 in-span:flex in-span:flex-col in-span:gap-0.75 in-small:text-uv-text-muted in-small:line-height-1p4">
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
