"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";
import { createRewriteAction, type WritingActionState } from "../actions";

const initialState: WritingActionState = { status: "idle" };

export function RewriteButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const t = useTranslations();
  const [state, action] = useActionState(createRewriteAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/writing/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <div className="writing-rewrite">
      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <ActionButton
          variant="secondary"
          pendingLabel={t("writing.rewrite.preparing")}
        >
          <RotateCcw size={17} />
          {t("writing.rewrite.button")}
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
