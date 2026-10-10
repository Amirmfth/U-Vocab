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
      className="reading-generation-preview grid gap-3.5 p-4.5 border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-strong:text-uv-f35097633a2"
      role="status"
      aria-live="polite"
      aria-label={t("reading.generatingLabel")}
    >
      <strong>{pending ? t("reading.generating") : t("reading.opening")}</strong>
      <div className="skeleton loading-generated-title rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-80pct-390px h-7.5" aria-hidden="true" />
      <div className="loading-generated-paragraphs grid gap-2.75 in-skeleton:w-full in-skeleton:h-3.75 in-skeleton-nth-child-3n:width-68pct in-skeleton-nth-child-5n:width-86pct" aria-hidden="true">
        <div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
        <div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
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
  const [requestId] = useState(() => crypto.randomUUID());
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
    <form action={action} className="panel story-form reading-generation-form border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 w-full max-w-uv-5dbc91eac8 grid gap-4.5 rounded-uv-r6d27d54c6c">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="form-grid story-settings-grid grid gap-3 grid-template-columns-repeat-2-minmax-0-1fr uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
        <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
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
        <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
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

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
        <label htmlFor="reading-topic">
          {t("reading.topic")} <span className="muted text-uv-text-muted">({t("reading.optional")})</span>
        </label>
        <input
          id="reading-topic"
          name="topic"
          placeholder={t("reading.topicPlaceholder")}
          dir="auto"
        />
      </div>

      {targetLevel !== currentLevel ? (
        <label className="reading-stretch-option flex items-start gap-2.5 padding-12px-14px border-1px-solid-border-2 rounded-uv-rd65225386d in-span:grid in-span:gap-0.75 in-small:text-uv-text-muted">
          <input type="checkbox" name="stretch" />
          <span>
            <strong>{t("reading.stretch", { level: targetLevel })}</strong>
            <small>{t("reading.stretchHelp", { level: currentLevel })}</small>
          </span>
        </label>
      ) : null}

      <fieldset className="target-picker story-target-picker m-0 p-0 border-0 in-legend:mb-2 in-legend:text-uv-text-soft in-legend:text-uv-f845cf53f3a in-legend:font-560 in-story-picker-hint:margin-10px-0-0">
        <legend>
          {t("reading.vocabFocus")} <span className="muted text-uv-text-muted">· {t("reading.optional")}</span>
        </legend>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="targetIds" value={id} />
        ))}

        <div className="story-word-search flex items-center gap-2.25 padding-0-12px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-muted in-input:min-h-11.5 in-input:border-0 in-input:p-0 in-input:bg-transparent in-focus-within:border-uv-primary">
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
          <div className="story-search-results grid gap-1.5 mt-2" role="listbox">
            {matches.map((target) => {
              const selected = selectedIds.includes(target.lexemeId);
              return (
                <button
                  className="story-search-result flex justify-between items-center gap-3 w-full padding-10px-12px border-1px-solid-border-2 rounded-uv-r0939007802 bg-uv-surface-raised text-uv-text text-left in-span-first-child:grid in-span-first-child:gap-0.5 in-small:text-uv-text-muted in-small:text-uv-fe9d5fd6635 disabled:opacity-0p58"
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
                  <span className="story-result-action inline-flex items-center gap-1 text-uv-primary-strong text-uv-f6c2d68ddb8 font-650">
                    {selected ? t("reading.added") : <><Plus size={15} /> {t("reading.add")}</>}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedTargets.length ? (
          <div className="story-selected-targets flex flex-wrap gap-2 mt-3.5">
            {selectedTargets.map((target) => (
              <span className="story-selected-target inline-flex items-center gap-1.25 padding-6px-8px-6px-10px rounded-uv-red9ab892c5 bg-uv-cbdfd7cd038 text-uv-primary-strong text-uv-fa2582d5d6e font-650 in-button-3:inline-flex in-button-3:p-0.25 in-button-3:border-0 in-button-3:bg-transparent in-button-3:text-inherit in-button-3:cursor-pointer" key={target.lexemeId}>
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
          <p className="story-picker-hint text-uv-text-muted text-uv-fe9d5fd6635">{t("reading.autoTargets")}</p>
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
