"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { createTopicPack, type TopicPackState } from "./actions";

const initialState: TopicPackState = { status: "idle" };

export function TopicPackForm({ defaultLevel }: { defaultLevel: string }) {
  const [state, action] = useActionState(createTopicPack, initialState);

  return (
    <form action={action} className="panel form-panel">
      <div className="field">
        <label htmlFor="topic">Topic or situation</label>
        <input
          id="topic"
          name="topic"
          placeholder="e.g. apartment hunting, programming, banking"
          required
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="level-trigger">Level</label>
          <ActivitySelect
            defaultValue={defaultLevel}
            id="level"
            name="level"
            options={["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => ({ label: level, value: level }))}
          />
        </div>
        <div className="field">
          <label htmlFor="size-trigger">Pack size</label>
          <ActivitySelect
            defaultValue="12"
            id="size"
            name="size"
            options={[8, 12, 16, 20, 24].map((size) => ({
              label: `${size} lexical units`,
              value: String(size),
            }))}
          />
        </div>
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message}
          {state.packId ? (
            <Link href={"/topic-packs/" + state.packId} className="status-link">
              Open pack <ArrowRight size={15} />
            </Link>
          ) : null}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Building your topic pack…">
        <Sparkles size={18} />
        Generate topic pack
      </ActionButton>
    </form>
  );
}
