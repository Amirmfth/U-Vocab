"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, BookOpenText } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { createStory, type StoryState } from "./actions";

const initialState: StoryState = { status: "idle" };

type TargetOption = {
  lexemeId: string;
  label: string;
  state: string;
};

export function StoryForm({
  defaultLevel,
  targets,
}: {
  defaultLevel: string;
  targets: TargetOption[];
}) {
  const [state, action] = useActionState(createStory, initialState);

  return (
    <form action={action} className="panel story-form">
      <div className="form-grid">
        <div className="field">
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

        <div className="field">
          <label htmlFor="length-trigger">Length</label>
          <ActivitySelect
            defaultValue="MEDIUM"
            id="length"
            name="length"
            options={[
              { label: "Short", value: "SHORT" },
              { label: "Medium", value: "MEDIUM" },
              { label: "Long", value: "LONG" },
            ]}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="topic">
          Topic <span className="muted">(optional)</span>
        </label>
        <input id="topic" name="topic" placeholder="Moving to a new city…" />
      </div>

      <fieldset className="target-picker">
        <legend>
          Target words <span className="muted">· auto-select if empty</span>
        </legend>
        <div className="target-option-grid">
          {targets.map((target) => (
            <label className="target-option" key={target.lexemeId}>
              <input type="checkbox" name="targetIds" value={target.lexemeId} />
              <span>
                <strong>{target.label}</strong>
                <small>{target.state.toLowerCase()}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      {state.status === "success" ? (
        <StatusNotice tone="success">
          {state.message}
          {state.storyId ? (
            <Link href={"/stories/" + state.storyId} className="status-link">
              Read <ArrowRight size={15} />
            </Link>
          ) : null}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Writing…">
        <BookOpenText size={18} />
        Create story
      </ActionButton>
    </form>
  );
}
