"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, ScanText } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  createReadingDocument,
  type ReadingCreateState,
} from "./actions";

const initialState: ReadingCreateState = { status: "idle" };

export function ReadingForm() {
  const [state, action] = useActionState(createReadingDocument, initialState);

  return (
    <form action={action} className="panel reading-form [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [width:100%] [max-width:760px] [border-radius:18px] [padding:15px] [&_textarea]:[min-height:38dvh]">
      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="title">Title <span className="muted [color:var(--text-muted)]">(optional)</span></label>
        <input id="title" name="title" placeholder="Article, email, transcript…" autoComplete="off" />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="content">German text</label>
        <textarea
          id="content"
          name="content"
          rows={12}
          placeholder="Paste German text here…"
          autoComplete="off"
          required
        />
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message}
          {state.documentId ? (
            <Link href={"/read/" + state.documentId} className="status-link [display:inline-flex] [align-items:center] [gap:6px]">
              Open reading <ArrowRight size={15} />
            </Link>
          ) : null}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Analyzing vocabulary in this text…">
        <ScanText size={18} />
        Analyze text
      </ActionButton>
    </form>
  );
}
