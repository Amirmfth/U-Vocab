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
    <form action={action} className="panel conversation-start-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-min620:grid uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min620:uv-vbec331cd32:uv-grid-column-93b665dfb5 uv-min620:uv-vc6a3ba666c:uv-grid-column-93b665dfb5 uv-min620:uv-vae41d3c771:uv-grid-column-93b665dfb5 uv-min620:uv-ve7e0cd887c:uv-grid-column-93b665dfb5 rounded-uv-r6d27d54c6c uv-v6e1e91da2a:flex uv-v6e1e91da2a:flex-col uv-min620:uv-v6e1e91da2a:grid uv-min620:uv-v6e1e91da2a:uv-grid-template-columns-dd0b1a1848 uv-min620:uv-vdb44acc009:uv-grid-column-93b665dfb5 uv-min620:uv-v4fd50aab40:uv-grid-column-93b665dfb5">
      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
        <label className="conversation-toggle min-h-13.5 flex items-start gap-2.5 uv-padding-3da39b7f2e cursor-pointer uv-vcf5ce320fa:w-4.5 uv-vcf5ce320fa:h-4.5 uv-vcf5ce320fa:mt-0.5 uv-v36c0309a03:flex uv-v36c0309a03:flex-col uv-v36c0309a03:gap-0.75 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:uv-line-height-a26f83404b">
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
