"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { BookOpenText, Plus, Search, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import {
  createGeneratedReading,
  type ReadingCreateState,
} from "./actions";

const initialState: ReadingCreateState = { status: "idle" };

function ReadingGenerationPreview({ navigating }: { navigating: boolean }) {
  const { pending } = useFormStatus();
  if (!pending && !navigating) return null;

  return (
    <div className="reading-generation-preview" role="status" aria-live="polite" aria-label="Generating reading">
      <strong>{pending ? "Generating your reading…" : "Opening your reading…"}</strong>
      <div className="skeleton loading-generated-title" aria-hidden="true" />
      <div className="loading-generated-paragraphs" aria-hidden="true">
        <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        <div className="skeleton" /><div className="skeleton" />
      </div>
    </div>
  );
}

type TargetOption = { lexemeId: string; label: string; state: string };
type GrammarOption = { id: string; title: string; level: string; status: string };

export function ReadingForm({
  currentLevel,
  targetLevel,
  targets,
  grammarOptions,
}: {
  currentLevel: string;
  targetLevel: string;
  targets: TargetOption[];
  grammarOptions: GrammarOption[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(createGeneratedReading, initialState);
  useEffect(() => {
    if (state.status === "success" && state.readingId) {
      router.push(`/reading/${state.readingId}`);
    }
  }, [router, state]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedTargets = useMemo(
    () =>
      selectedIds
        .map((id) => targets.find((target) => target.lexemeId === id))
        .filter((target): target is TargetOption => Boolean(target)),
    [selectedIds, targets],
  );
  const search = query.trim().toLocaleLowerCase("de-DE");
  const matches = search
    ? targets
        .filter((target) =>
          target.label.toLocaleLowerCase("de-DE").includes(search),
        )
        .slice(0, 8)
    : [];

  return (
    <form action={action} className="panel story-form reading-generation-form">
      <div className="form-grid story-settings-grid">
        <div className="field">
          <label htmlFor="reading-length-trigger">Length</label>
          <ActivitySelect
            defaultValue="MEDIUM"
            id="reading-length"
            name="length"
            options={[
              { label: "Short · 5 target words", value: "SHORT" },
              { label: "Medium · 10 target words", value: "MEDIUM" },
              { label: "Long · 15 target words", value: "LONG" },
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="grammar-focus-trigger">Grammar focus</label>
          <ActivitySelect
            defaultValue=""
            id="grammar-focus"
            name="grammarFocusId"
            options={[
              { label: "Recommended automatically", value: "" },
              ...grammarOptions.map((option) => ({
                label: `${option.title} · ${option.level} · ${option.status.toLowerCase().replaceAll("_", " ")}`,
                value: option.id,
              })),
            ]}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="reading-topic">
          Topic <span className="muted">(optional)</span>
        </label>
        <input
          id="reading-topic"
          name="topic"
          placeholder="Work, travel, daily life, culture…"
        />
      </div>

      {targetLevel !== currentLevel ? (
        <label className="reading-stretch-option">
          <input type="checkbox" name="stretch" />
          <span>
            <strong>Stretch toward {targetLevel}</strong>
            <small>
              Default difficulty is your current level ({currentLevel}).
            </small>
          </span>
        </label>
      ) : null}

      <fieldset className="target-picker story-target-picker">
        <legend>
          Vocabulary focus <span className="muted">· optional</span>
        </legend>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="targetIds" value={id} />
        ))}

        <div className="story-word-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search your vocabulary"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Add words you want to meet in context…"
          />
        </div>

        {matches.length ? (
          <div className="story-search-results" role="listbox">
            {matches.map((target) => {
              const selected = selectedIds.includes(target.lexemeId);
              return (
                <button
                  className="story-search-result"
                  key={target.lexemeId}
                  type="button"
                  disabled={selected}
                  onClick={() =>
                    setSelectedIds((current) =>
                      current.includes(target.lexemeId)
                        ? current
                        : [...current, target.lexemeId],
                    )
                  }
                >
                  <span>
                    <strong>{target.label}</strong>
                    <small>{target.state.toLowerCase()}</small>
                  </span>
                  <span className="story-result-action">
                    {selected ? "Added" : <><Plus size={15} /> Add</>}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedTargets.length ? (
          <div className="story-selected-targets">
            {selectedTargets.map((target) => (
              <span className="story-selected-target" key={target.lexemeId}>
                {target.label}
                <button
                  type="button"
                  aria-label={`Remove ${target.label}`}
                  onClick={() =>
                    setSelectedIds((current) =>
                      current.filter((id) => id !== target.lexemeId),
                    )
                  }
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="story-picker-hint">
            Leave empty to let U-Vocab choose useful weak vocabulary.
          </p>
        )}
      </fieldset>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
      <ReadingGenerationPreview navigating={state.status === "success" && Boolean(state.readingId)} />

      <ActionButton pendingLabel="Generating reading…">
        <BookOpenText size={18} />
        Generate reading
      </ActionButton>
    </form>
  );
}
