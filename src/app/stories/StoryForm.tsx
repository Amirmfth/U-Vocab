"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Layers3,
  Plus,
  Search,
  X,
} from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { createStory, type StoryState } from "./actions";

const initialState: StoryState = { status: "idle" };

type TargetOption = { lexemeId: string; label: string; state: string };
type TopicPack = {
  id: string;
  title: string;
  items: Array<{ lexemeId: string; label: string }>;
};

export function StoryForm({
  defaultLevel,
  targets,
  topicPacks,
}: {
  defaultLevel: string;
  targets: TargetOption[];
  topicPacks: TopicPack[];
}) {
  const [state, action] = useActionState(createStory, initialState);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packId, setPackId] = useState("");
  const allTargets = useMemo(() => {
    const byId = new Map(targets.map((target) => [target.lexemeId, target]));
    for (const pack of topicPacks)
      for (const item of pack.items) {
        if (!byId.has(item.lexemeId))
          byId.set(item.lexemeId, { ...item, state: "topic pack" });
      }
    return [...byId.values()];
  }, [targets, topicPacks]);
  const selectedTargets = selectedIds
    .map((id) => allTargets.find((target) => target.lexemeId === id))
    .filter((target): target is TargetOption => Boolean(target));
  const search = query.trim().toLocaleLowerCase("de-DE");
  const matches = search
    ? allTargets
        .filter((target) =>
          target.label.toLocaleLowerCase("de-DE").includes(search),
        )
        .slice(0, 8)
    : [];
  const addTarget = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  const removeTarget = (id: string) =>
    setSelectedIds((current) =>
      current.filter((currentId) => currentId !== id),
    );
  const addPack = () => {
    const pack = topicPacks.find((item) => item.id === packId);
    if (pack)
      setSelectedIds((current) => [
        ...new Set([...current, ...pack.items.map((item) => item.lexemeId)]),
      ]);
  };

  return (
    <form action={action} className="panel story-form">
      <div className="form-grid story-settings-grid">
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

      <fieldset className="target-picker story-target-picker">
        <legend>
          Target words <span className="muted">· auto-select if empty</span>
        </legend>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="targetIds" value={id} />
        ))}
        <div className="story-word-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search your words"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your words to add…"
          />
        </div>
        {matches.length ? (
          <div
            className="story-search-results"
            role="listbox"
            aria-label="Matching words"
          >
            {matches.map((target) => {
              const isSelected = selectedIds.includes(target.lexemeId);
              return (
                <button
                  className="story-search-result"
                  key={target.lexemeId}
                  type="button"
                  onClick={() => addTarget(target.lexemeId)}
                  disabled={isSelected}
                >
                  <span>
                    <strong>{target.label}</strong>
                    <small>{target.state.toLowerCase()}</small>
                  </span>
                  <span className="story-result-action">
                    {isSelected ? (
                      "Added"
                    ) : (
                      <>
                        <Plus size={15} />
                        Add
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : query.trim() ? (
          <p className="story-picker-hint">No matching words found.</p>
        ) : null}

        {topicPacks.length ? (
          <div className="story-pack-add">
            <Layers3 size={18} aria-hidden="true" />
            <label htmlFor="story-pack-trigger">Add a topic pack</label>
            <ActivitySelect
              defaultValue=""
              id="story-pack"
              name="storyPackId"
              onValueChange={setPackId}
              options={[
                { label: "Choose a saved pack…", value: "" },
                ...topicPacks.map((pack) => ({
                  label: `${pack.title} (${pack.items.length})`,
                  value: pack.id,
                })),
              ]}
            />
            <button
              className="button button-secondary"
              disabled={!packId}
              onClick={addPack}
              type="button"
            >
              <Plus size={16} />
              Add pack
            </button>
          </div>
        ) : null}

        {selectedTargets.length && (
          <div className="story-selected-targets" aria-live="polite">
            {selectedTargets.map((target) => (
              <span className="story-selected-target" key={target.lexemeId}>
                {target.label}
                <button
                  aria-label={`Remove ${target.label}`}
                  onClick={() => removeTarget(target.lexemeId)}
                  type="button"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
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
