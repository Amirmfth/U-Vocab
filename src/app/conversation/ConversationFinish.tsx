"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";
import {
  completeConversationAction,
  replayConversationAction,
  type ConversationActionState,
} from "./actions";

const initialState: ConversationActionState = { status: "idle" };

export function ConversationFinish({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const t = useTranslations();
  const [state, action] = useActionState(
    completeConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <div className="conversation-finish flex flex-col gap-2">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton pendingLabel={t("conversation.evaluating")}>
          <CheckCircle2 size={17} />
          {t("conversation.finish")}
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}

export function ConversationReplay({
  sessionId,
  kind,
}: {
  sessionId: string;
  kind: "PRACTICE" | "MISSION";
}) {
  const router = useRouter();
  const t = useTranslations();
  const [state, action] = useActionState(
    replayConversationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/conversation/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <div className="conversation-replay flex flex-col gap-2 uv-min620:flex-row">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton variant="secondary" pendingLabel={t("conversation.preparingReplay")}>
          <RotateCcw size={17} />
          {t("conversation.replay")}
        </ActionButton>
      </form>
      <Link href="/conversation" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
        {kind === "MISSION" ? t("conversation.newMission") : t("conversation.newConversation")}
      </Link>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
