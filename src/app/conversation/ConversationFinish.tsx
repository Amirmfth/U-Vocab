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
      <Link href="/conversation" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
        {kind === "MISSION" ? t("conversation.newMission") : t("conversation.newConversation")}
      </Link>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
