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
    <form action={action} className="panel reading-form">
      <div className="field">
        <label htmlFor="title">Title <span className="muted">(optional)</span></label>
        <input id="title" name="title" placeholder="Article, email, transcript…" autoComplete="off" />
      </div>

      <div className="field">
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
            <Link href={"/read/" + state.documentId} className="status-link">
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
