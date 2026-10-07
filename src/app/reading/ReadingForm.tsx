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
      className="reading-generation-preview [display:grid] [gap:14px] [padding:18px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_>_strong]:[font-size:0.88rem]"
      role="status"
      aria-live="polite"
      aria-label={t("reading.generatingLabel")}
    >
      <strong>{pending ? t("reading.generating") : t("reading.opening")}</strong>
      <div className="skeleton loading-generated-title [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(80%,_390px)] [height:30px]" aria-hidden="true" />
      <div className="loading-generated-paragraphs [display:grid] [gap:11px] [&_.skeleton]:[width:100%] [&_.skeleton]:[height:15px] [&_.skeleton:nth-child(3n)]:[width:68%] [&_.skeleton:nth-child(5n)]:[width:86%]" aria-hidden="true">
        <div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" /><div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" /><div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" />
        <div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" /><div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" />
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
    <form action={action} className="panel story-form reading-generation-form [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:100%] [max-width:780px] [display:grid] [gap:18px] [border-radius:18px]">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="form-grid story-settings-grid [display:grid] [gap:12px] [grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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
        <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="reading-topic">
          {t("reading.topic")} <span className="muted [color:var(--text-muted)]">({t("reading.optional")})</span>
        </label>
        <input
          id="reading-topic"
          name="topic"
          placeholder={t("reading.topicPlaceholder")}
          dir="auto"
        />
      </div>

      {targetLevel !== currentLevel ? (
        <label className="reading-stretch-option [display:flex] [align-items:flex-start] [gap:10px] [padding:12px_14px] [border:1px_solid_var(--border)] [border-radius:14px] [&_span]:[display:grid] [&_span]:[gap:3px] [&_small]:[color:var(--text-muted)]">
          <input type="checkbox" name="stretch" />
          <span>
            <strong>{t("reading.stretch", { level: targetLevel })}</strong>
            <small>{t("reading.stretchHelp", { level: currentLevel })}</small>
          </span>
        </label>
      ) : null}

      <fieldset className="target-picker story-target-picker [margin:0] [padding:0] [border:0] [&_legend]:[margin-bottom:8px] [&_legend]:[color:var(--text-soft)] [&_legend]:[font-size:0.83rem] [&_legend]:[font-weight:560] [&_.story-picker-hint]:[margin:10px_0_0]">
        <legend>
          {t("reading.vocabFocus")} <span className="muted [color:var(--text-muted)]">· {t("reading.optional")}</span>
        </legend>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="targetIds" value={id} />
        ))}

        <div className="story-word-search [display:flex] [align-items:center] [gap:9px] [padding:0_12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [color:var(--text-muted)] [&_input]:[min-height:46px] [&_input]:[border:0] [&_input]:[padding:0] [&_input]:[background:transparent] [&:focus-within]:[border-color:var(--primary)]">
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
          <div className="story-search-results [display:grid] [gap:6px] [margin-top:8px]" role="listbox">
            {matches.map((target) => {
              const selected = selectedIds.includes(target.lexemeId);
              return (
                <button
                  className="story-search-result [display:flex] [justify-content:space-between] [align-items:center] [gap:12px] [width:100%] [padding:10px_12px] [border:1px_solid_var(--border)] [border-radius:12px] [background:var(--surface-raised)] [color:var(--text)] [text-align:left] [&_>_span:first-child]:[display:grid] [&_>_span:first-child]:[gap:2px] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.78rem] [&:disabled]:[opacity:0.58]"
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
                  <span className="story-result-action [display:inline-flex] [align-items:center] [gap:4px] [color:var(--primary-strong)] [font-size:0.8rem] [font-weight:650]">
                    {selected ? t("reading.added") : <><Plus size={15} /> {t("reading.add")}</>}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedTargets.length ? (
          <div className="story-selected-targets [display:flex] [flex-wrap:wrap] [gap:8px] [margin-top:14px]">
            {selectedTargets.map((target) => (
              <span className="story-selected-target [display:inline-flex] [align-items:center] [gap:5px] [padding:6px_8px_6px_10px] [border-radius:999px] [background:var(--primary-soft)] [color:var(--primary-strong)] [font-size:0.82rem] [font-weight:650] [&_button]:[display:inline-flex] [&_button]:[padding:1px] [&_button]:[border:0] [&_button]:[background:transparent] [&_button]:[color:inherit] [&_button]:[cursor:pointer]" key={target.lexemeId}>
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
          <p className="story-picker-hint [color:var(--text-muted)] [font-size:0.78rem]">{t("reading.autoTargets")}</p>
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
