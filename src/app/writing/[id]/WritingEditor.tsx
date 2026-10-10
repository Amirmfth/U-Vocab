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
    <form action={action} className="writing-editor flex flex-col gap-3.5 uv-v3c40c23539:resize-y uv-v3c40c23539:text-uv-f19feeb881c uv-v3c40c23539:uv-line-height-cf9a155f4a uv-v3c40c23539:uv-min-height-acf4fad8b6 uv-v3c40c23539:p-3.5">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="writing-editor-heading flex flex-col gap-0.75 uv-v586b3820a5:text-uv-text uv-v586b3820a5:text-uv-fee84419642 uv-v586b3820a5:uv-weight-650 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff1713651e0">
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

      <div className="writing-editor-footer flex flex-col gap-2.25 uv-v22810335d8:text-uv-text-muted uv-v22810335d8:uv-font-family-320794573f uv-v22810335d8:text-uv-f63777cce16 uv-v60c3901c7a:text-uv-warning uv-min620:flex-row uv-min620:items-center uv-min620:justify-between sticky uv-bottom-19e81ff378 uv-z-index-1b64538924 p-2.25 uv-border-8d7f82f403 rounded-uv-r344c386330 bg-uv-c54c3fe5d99 uv-backdrop-filter-fa0b2b5363 uv-min620:static uv-min620:p-0 uv-min620:border-0 uv-min620:bg-transparent uv-min620:uv-backdrop-filter-71f8e7976e">
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
