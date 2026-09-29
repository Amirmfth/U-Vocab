"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { BookOpenText, Plus, Search, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import {
  createGeneratedReading,
  type ReadingCreateState,
} from "./actions";

const initialState: ReadingCreateState = { status: "idle" };

function ReadingGenerationPreview({ navigating }: { navigating: boolean }) {
  const { pending } = useFormStatus();
  const t = useI18n().t;
  if (!pending && !navigating) return null;

  return (
    <div
      className="reading-generation-preview"
      role="status"
      aria-live="polite"
      aria-label={t("reading.generatingLabel")}
    >
      <strong>{pending ? t("reading.generating") : t("reading.opening")}</strong>
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
  targetLanguage,
  targets,
  grammarOptions,
}: {
  currentLevel: string;
  targetLevel: string;
  targetLanguage: "de" | "fr" | "en";
  targets: TargetOption[];
  grammarOptions: GrammarOption[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(createGeneratedReading, initialState);
  const { locale, t } = useI18n();

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
          <label htmlFor="reading-length-trigger">{t("reading.length")}</label>
          <ActivitySelect
            defaultValue="MEDIUM"
            id="reading-length"
            name="length"
            options={[
              { label: t("reading.short"), value: "SHORT" },
              { label: t("reading.medium"), value: "MEDIUM" },
              { label: t("reading.long"), value: "LONG" },
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="grammar-focus-trigger">{t("reading.grammarFocus")}</label>
          <ActivitySelect
            defaultValue=""
            id="grammar-focus"
            name="grammarFocusId"
            options={[
              { label: t("reading.recommendedAutomatically"), value: "" },
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
          {t("reading.topic")} <span className="muted">({t("reading.optional")})</span>
        </label>
        <input
          id="reading-topic"
          name="topic"
          placeholder={t("reading.topicPlaceholder")}
          dir="auto"
        />
      </div>

      {targetLevel !== currentLevel ? (
        <label className="reading-stretch-option">
          <input type="checkbox" name="stretch" />
          <span>
            <strong>{t("reading.stretch", { level: targetLevel })}</strong>
            <small>{t("reading.stretchHelp", { level: currentLevel })}</small>
          </span>
        </label>
      ) : null}

      <fieldset className="target-picker story-target-picker">
        <legend>
          {t("reading.vocabFocus")} <span className="muted">· {t("reading.optional")}</span>
        </legend>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="targetIds" value={id} />
        ))}

        <div className="story-word-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label={t("reading.searchVocabulary")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("reading.searchPlaceholder")}
            dir="auto"
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
                    <strong className="learning-content" lang={targetLanguage} dir="ltr">
                      {target.label}
                    </strong>
                    <small>{target.state.toLowerCase()}</small>
                  </span>
                  <span className="story-result-action">
                    {selected ? t("reading.added") : <><Plus size={15} /> {t("reading.add")}</>}
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
                <span className="learning-content" lang={targetLanguage} dir="ltr">
                  {target.label}
                </span>
                <button
                  type="button"
                  aria-label={t("reading.remove", { word: target.label })}
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
          <p className="story-picker-hint">{t("reading.autoTargets")}</p>
        )}
      </fieldset>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ReadingGenerationPreview
        navigating={state.status === "success" && Boolean(state.readingId)}
      />

      <ActionButton pendingLabel={t("reading.generatingShort")}>
        <BookOpenText size={18} />
        {t("reading.generate")}
      </ActionButton>

      <span className="sr-only">{formatNumber(locale, selectedIds.length)}</span>
    </form>
  );
}
