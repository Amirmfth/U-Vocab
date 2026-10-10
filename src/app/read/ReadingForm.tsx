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
    <form action={action} className="panel reading-form border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 w-full max-w-uv-c078f10a0b rounded-exact-18px p-3.75 in-textarea:min-height-38dvh">
      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <label htmlFor="title">Title <span className="muted text-uv-text-muted">(optional)</span></label>
        <input id="title" name="title" placeholder="Article, email, transcript…" autoComplete="off" />
      </div>

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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
