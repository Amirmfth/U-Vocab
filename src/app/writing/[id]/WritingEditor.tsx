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
    <form action={action} className="writing-editor [display:flex] [flex-direction:column] [gap:14px] [&_textarea]:[resize:vertical] [&_textarea]:[font-size:1rem] [&_textarea]:[line-height:1.65] [&_textarea]:[min-height:48dvh] [&_textarea]:[padding:14px]">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="writing-editor-heading [display:flex] [flex-direction:column] [gap:3px] [&_label]:[color:var(--text)] [&_label]:[font-size:0.9rem] [&_label]:[font-weight:650] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.72rem]">
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

      <div className="writing-editor-footer [display:flex] [flex-direction:column] [gap:9px] [&_>_span]:[color:var(--text-muted)] [&_>_span]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_>_span]:[font-size:0.74rem] [&_>_span.is-under]:[color:var(--warning)] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center] min-[620px]:[justify-content:space-between] [position:sticky] [bottom:calc(96px_+_env(safe-area-inset-bottom))] [z-index:4] [padding:9px] [border:1px_solid_var(--border)] [border-radius:15px] [background:rgba(17,_17,_20,_0.94)] [backdrop-filter:blur(14px)] min-[620px]:[position:static] min-[620px]:[padding:0] min-[620px]:[border:0] min-[620px]:[background:transparent] min-[620px]:[backdrop-filter:none]">
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
