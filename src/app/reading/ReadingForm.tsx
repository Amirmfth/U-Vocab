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
      className="reading-generation-preview grid gap-3.5 p-4.5 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-ve6b262f465:text-uv-f35097633a2"
      role="status"
      aria-live="polite"
      aria-label={t("reading.generatingLabel")}
    >
      <strong>{pending ? t("reading.generating") : t("reading.opening")}</strong>
      <div className="skeleton loading-generated-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-e4b8e80a02 h-7.5" aria-hidden="true" />
      <div className="loading-generated-paragraphs grid gap-2.75 uv-v56f1a99c32:w-full uv-v56f1a99c32:h-3.75 uv-v8a023aef31:uv-width-1c1d4ebb4c uv-va056c95d80:uv-width-6dd6198fd9" aria-hidden="true">
        <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
        <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
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
    <form action={action} className="panel story-form reading-generation-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 w-full max-w-uv-5dbc91eac8 grid gap-4.5 rounded-uv-r6d27d54c6c">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="form-grid story-settings-grid grid gap-3 uv-grid-template-columns-dd0b1a1848 uv-min620:uv-grid-template-columns-dd0b1a1848">
        <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
        <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
        <label className="reading-stretch-option flex items-start gap-2.5 uv-padding-277e98e510 uv-border-8d7f82f403 rounded-uv-rd65225386d uv-v36c0309a03:grid uv-v36c0309a03:gap-0.75 uv-v982220ddd5:text-uv-text-muted">
          <input type="checkbox" name="stretch" />
          <span>
            <strong>{t("reading.stretch", { level: targetLevel })}</strong>
            <small>{t("reading.stretchHelp", { level: currentLevel })}</small>
          </span>
        </label>
      ) : null}

      <fieldset className="target-picker story-target-picker m-0 p-0 border-0 uv-v73883af7e9:mb-2 uv-v73883af7e9:text-uv-text-soft uv-v73883af7e9:text-uv-f845cf53f3a uv-v73883af7e9:uv-weight-560 uv-v6b038101b8:uv-margin-456435724d">
        <legend>
          {t("reading.vocabFocus")} <span className="muted text-uv-text-muted">· {t("reading.optional")}</span>
        </legend>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="targetIds" value={id} />
        ))}

        <div className="story-word-search flex items-center gap-2.25 uv-padding-f74548ca12 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-muted uv-vcf5ce320fa:min-h-11.5 uv-vcf5ce320fa:border-0 uv-vcf5ce320fa:p-0 uv-vcf5ce320fa:bg-transparent uv-ve65c99bcbe:border-uv-primary">
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
                  className="story-search-result flex justify-between items-center gap-3 w-full uv-padding-df857c6c31 uv-border-8d7f82f403 rounded-uv-r0939007802 bg-uv-surface-raised text-uv-text text-left uv-v386ffa8f69:grid uv-v386ffa8f69:gap-0.5 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-fe9d5fd6635 disabled:uv-opacity-8ecc5701b7"
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
                  <span className="story-result-action inline-flex items-center gap-1 text-uv-primary-strong text-uv-f6c2d68ddb8 uv-weight-650">
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
              <span className="story-selected-target inline-flex items-center gap-1.25 uv-padding-6eea9087d4 rounded-uv-red9ab892c5 bg-uv-cbdfd7cd038 text-uv-primary-strong text-uv-fa2582d5d6e uv-weight-650 uv-v513a7112a0:inline-flex uv-v513a7112a0:p-0.25 uv-v513a7112a0:border-0 uv-v513a7112a0:bg-transparent uv-v513a7112a0:text-inherit uv-v513a7112a0:cursor-pointer" key={target.lexemeId}>
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
