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
    <div className="conversation-finish">
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
    <div className="conversation-replay">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton variant="secondary" pendingLabel={t("conversation.preparingReplay")}>
          <RotateCcw size={17} />
          {t("conversation.replay")}
        </ActionButton>
      </form>
      <Link href="/conversation" className="button button-primary">
        {kind === "MISSION" ? t("conversation.newMission") : t("conversation.newConversation")}
      </Link>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
