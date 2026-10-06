"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { evaluateWritingAction, type WritingActionState } from "../actions";

const initialState: WritingActionState = { status: "idle" };

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function WritingEditor({
  sessionId,
  initialDraft,
  targetWords,
  targetLanguageCode,
}: {
  sessionId: string;
  initialDraft: string;
  targetWords: number;
  targetLanguageCode: string;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState(initialDraft);
  const [state, action] = useActionState(evaluateWritingAction, initialState);
  const words = useMemo(() => countWords(draft), [draft]);

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <form action={action} className="writing-editor">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="writing-editor-heading">
        <label htmlFor="writing-draft">{t("writing.editor.response")}</label>
        <span>{t("writing.editor.help")}</span>
      </div>
      <textarea
        id="writing-draft"
        name="draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={18}
        placeholder={t("writing.editor.placeholder")}
        autoComplete="off"
        aria-describedby="writing-word-count"
        lang={targetLanguageCode}
        dir="ltr"
      />

      <div className="writing-editor-footer">
        <span
          id="writing-word-count"
          className={words < targetWords * 0.7 ? "is-under" : ""}
        >
          {t("writing.editor.count", {
            count: formatNumber(locale, words),
            target: formatNumber(locale, targetWords),
          })}
        </span>

        <ActionButton
          pendingLabel={t("writing.editor.evaluating")}
          disabled={words < 20}
        >
          <Send className="rtl-mirror" size={17} />
          {t("writing.editor.submit")}
        </ActionButton>
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </form>
  );
}
