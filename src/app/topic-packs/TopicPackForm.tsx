"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { createTopicPack, type TopicPackState } from "./actions";

const initialState: TopicPackState = { status: "idle" };

export function TopicPackForm({ defaultLevel }: { defaultLevel: string }) {
  const [state, action] = useActionState(createTopicPack, initialState);

  return (
    <form action={action} className="panel form-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 w-full max-w-uv-74487d394e rounded-uv-r6d27d54c6c">
      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
        <label htmlFor="topic">Topic or situation</label>
        <input
          id="topic"
          name="topic"
          placeholder="Apartment hunting, programming, banking…"
          required
        />
      </div>

      <div className="form-grid grid uv-grid-template-columns-6a5c4d4d49 gap-3 uv-min620:uv-grid-template-columns-dd0b1a1848">
        <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
          <label htmlFor="level-trigger">Level</label>
          <ActivitySelect
            defaultValue={defaultLevel}
            id="level"
            name="level"
            options={["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => ({
              label: level,
              value: level,
            }))}
          />
        </div>

        <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
          <label htmlFor="size-trigger">Words</label>
          <ActivitySelect
            defaultValue="12"
            id="size"
            name="size"
            options={[8, 12, 16, 20, 24].map((size) => ({
              label: String(size),
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
            <Link href={"/topic-packs/" + state.packId} className="status-link inline-flex items-center gap-1.5">
              Open <ArrowRight size={15} />
            </Link>
          ) : null}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Creating…">
        <Plus size={18} />
        Create pack
      </ActionButton>
    </form>
  );
}
