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
    <form action={action} className="panel reading-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 w-full max-w-uv-c078f10a0b rounded-uv-r6d27d54c6c p-3.75 uv-v3c40c23539:uv-min-height-92341db0b5">
      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
        <label htmlFor="title">Title <span className="muted text-uv-text-muted">(optional)</span></label>
        <input id="title" name="title" placeholder="Article, email, transcript…" autoComplete="off" />
      </div>

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
            <Link href={"/read/" + state.documentId} className="status-link inline-flex items-center gap-1.5">
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
