"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
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
          <label htmlFor="level">Level</label>
          <select id="level" name="level" defaultValue={defaultLevel}>
            {["A1","A2","B1","B2","C1","C2"].map((level) => (
              <option value={level} key={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="length">Length</label>
          <select id="length" name="length" defaultValue="MEDIUM">
            <option value="SHORT">Short</option>
            <option value="MEDIUM">Medium</option>
            <option value="LONG">Long</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="topic">Story topic <span className="muted">(optional)</span></label>
        <input id="topic" name="topic" placeholder="e.g. moving to a new city" />
      </div>

      <fieldset className="target-picker">
        <legend>Target vocabulary <span className="muted">(optional)</span></legend>
        <p className="form-help">
          Leave everything unchecked to let U-Vocab select weak/learning words automatically.
        </p>
        <div className="target-option-grid">
          {targets.map((target) => (
            <label className="target-option" key={target.lexemeId}>
              <input type="checkbox" name="targetIds" value={target.lexemeId} />
              <span>
                <strong>{target.label}</strong>
                <small>{target.state}</small>
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
              Read story <ArrowRight size={15} />
            </Link>
          ) : null}
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Writing your story…">
        <Sparkles size={18} />
        Generate story
      </ActionButton>
    </form>
  );
}
