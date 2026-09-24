"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { markStoryRead, type ReadState } from "../actions";

const initialState: ReadState = { status: "idle" };

export function ReadStoryButton({ storyId }: { storyId: string }) {
  const [state, action] = useActionState(markStoryRead, initialState);
  return (
    <div className="read-story-action">
      <form action={action}>
        <input type="hidden" name="storyId" value={storyId} />
        <ActionButton pendingLabel="Saving…"><CheckCircle2 size={18} />Mark as read</ActionButton>
      </form>
      {state.status === "success" ? <StatusNotice tone="success">{state.message}</StatusNotice> : null}
      {state.status === "error" ? <StatusNotice tone="error">{state.message}</StatusNotice> : null}
    </div>
  );
}
