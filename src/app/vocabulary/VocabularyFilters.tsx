"use client";

import { ChevronLeft, Filter, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TranslationLanguage } from "@prisma/client";
import { useTranslations } from "@/i18n/client";
import type { MessageKey } from "@/i18n/core";

type FilterKey = "status" | "pos" | "level" | "relation" | "sort";

type FilterOption = {
  label: string;
  value: string;
};

type FilterDefinition = {
  key: FilterKey;
  label: string;
  options: FilterOption[];
};

function withAll(label: string, values: FilterOption[]) {
  return [{ value: "ALL", label }, ...values];
}

function isDefaultValue(key: FilterKey, value: string) {
  return value === "ALL" || (key === "sort" && value === "RECENTLY_ADDED");
}

const partOfSpeechKeys: Record<string, MessageKey> = {
  NOUN: "vocab.pos.noun",
  VERB: "vocab.pos.verb",
  ADJECTIVE: "vocab.pos.adjective",
  ADVERB: "vocab.pos.adverb",
  PRONOUN: "vocab.pos.pronoun",
  PREPOSITION: "vocab.pos.preposition",
  CONJUNCTION: "vocab.pos.conjunction",
  INTERJECTION: "vocab.pos.interjection",
  PHRASE: "vocab.pos.phrase",
  OTHER: "vocab.pos.other",
};

export function VocabularyFilters({
  current,
  partOfSpeechOptions,
  levelOptions,
  language,
  onLanguageChange,
}: {
  current: Record<FilterKey | "q", string>;
  partOfSpeechOptions: FilterOption[];
  levelOptions: FilterOption[];
  language: TranslationLanguage;
  onLanguageChange: (language: TranslationLanguage) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menu, setMenu] = useState<"types" | FilterKey | null>(null);
  const [menuOffset, setMenuOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations();

  const localizedPosOptions = partOfSpeechOptions.map((option) => ({
    ...option,
    label: partOfSpeechKeys[option.value] ? t(partOfSpeechKeys[option.value]) : option.label,
  }));

  const filters: FilterDefinition[] = [
    {
      key: "status",
      label: t("vocab.filter.status"),
      options: [
        { value: "ALL", label: t("vocab.filter.allVocabulary") },
        { value: "NEW", label: t("vocab.filter.new") },
        { value: "LEARNING", label: t("vocab.filter.learning") },
        { value: "WEAK", label: t("vocab.filter.weak") },
        { value: "STRONG", label: t("vocab.filter.strong") },
        { value: "MASTERED", label: t("vocab.filter.mastered") },
        { value: "DUE", label: t("vocab.filter.due") },
        { value: "RECENT", label: t("vocab.filter.recent") },
        { value: "DIFFICULT", label: t("vocab.filter.difficult") },
      ],
    },
    {
      key: "pos",
      label: t("vocab.filter.pos"),
      options: withAll(t("vocab.filter.anyPos"), localizedPosOptions),
    },
    {
      key: "level",
      label: t("vocab.filter.level"),
      options: withAll(t("vocab.filter.anyLevel"), levelOptions),
    },
    {
      key: "sort",
      label: t("vocab.filter.sort"),
      options: [
        { value: "RECENTLY_ADDED", label: t("vocab.filter.recentlyAdded") },
        { value: "ALPHABETICAL", label: t("vocab.filter.alphabetical") },
        { value: "CEFR_ASC", label: t("vocab.filter.cefrAsc") },
        { value: "CEFR_DESC", label: t("vocab.filter.cefrDesc") },
        { value: "MASTERY_ASC", label: t("vocab.filter.lowestMastery") },
        { value: "MASTERY_DESC", label: t("vocab.filter.highestMastery") },
        { value: "NEXT_REVIEW", label: t("vocab.filter.nextReview") },
      ],
    },
    {
      key: "relation",
      label: t("vocab.filter.relationship"),
      options: [
        { value: "ALL", label: t("vocab.filter.anyRelationship") },
        { value: "WORD_FAMILY", label: t("vocab.filter.wordFamily") },
        { value: "COLLOCATION", label: t("vocab.filter.collocations") },
        { value: "RELATED", label: t("vocab.filter.semantic") },
      ],
    },
  ];

  useEffect(() => {
    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    }

    document.addEventListener("pointerdown", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    function positionMenu() {
      const button = addButtonRef.current;
      if (!button) return;
      const width = Math.min(300, window.innerWidth - 32);
      const rect = button.getBoundingClientRect();
      const inlineStart =
        document.documentElement.dir === "rtl"
          ? window.innerWidth - rect.right
          : rect.left;
      setMenuOffset(Math.min(0, window.innerWidth - 16 - inlineStart - width));
    }
    positionMenu();
    window.addEventListener("resize", positionMenu);
    return () => window.removeEventListener("resize", positionMenu);
  }, [menu]);

  function setParam(key: FilterKey, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault = isDefaultValue(key, value);
    if (!value || isDefault) params.delete(key);
    else params.set(key, value);
    router.push("/vocabulary" + (params.toString() ? "?" + params.toString() : ""));
    setMenu(null);
  }

  function updateSearch(value: string) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const query = value.trim();
      if (query) params.set("q", query);
      else params.delete("q");
      router.replace("/vocabulary" + (params.toString() ? "?" + params.toString() : ""));
    }, 180);
  }

  const activeFilters = filters.flatMap((filter) => {
    if (isDefaultValue(filter.key, current[filter.key])) return [];
    const option = filter.options.find((item) => item.value === current[filter.key]);
    return option ? [{ ...filter, valueLabel: option.label }] : [];
  });

  const selectedFilter =
    typeof menu === "string" && menu !== "types"
      ? filters.find((filter) => filter.key === menu)
      : null;

  return (
    <section className="library-tools [display:flex] [flex-direction:column] [gap:8px]">
      <form className="library-search [min-height:48px] [grid-template-columns:auto_minmax(0,_1fr)_auto] [padding:0_8px_0_13px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [&_input]:[min-height:44px] [&_input]:[padding:0] [&_input]:[border:0] [&_input]:[background:transparent] [&_input:focus]:[box-shadow:none] [position:relative] [display:flex] [align-items:center] [gap:8px] [&_>_svg]:[position:absolute] [&_>_svg]:[left:13px] [&_>_svg]:[z-index:1] [&_>_svg]:[color:var(--text-muted)] [&_input[type=text]]:[min-height:48px] [&_input[type=text]]:[padding-left:40px] [&_input[type=text]]:[padding-right:48px] [&_input[name=q]]:[min-height:48px] [&_input[name=q]]:[padding-left:40px] [&_input[name=q]]:[padding-right:48px] [&_.icon-button]:[position:absolute] [&_.icon-button]:[right:3px] [&_.icon-button]:[width:42px] [&_.icon-button]:[height:42px] [&_.icon-button]:[min-height:42px] [&_.icon-button]:[border:0] [&_.icon-button]:[background:transparent]" action="/vocabulary">
        <input
          name="q"
          defaultValue={current.q}
          onChange={(event) => updateSearch(event.currentTarget.value)}
          placeholder={t("vocab.searchPlaceholder")}
          aria-label={t("vocab.search")}
        />
        {filters.map((filter) => {
          const value = current[filter.key];
          const isDefault = isDefaultValue(filter.key, value);
          return !isDefault ? (
            <input key={filter.key} type="hidden" name={filter.key} value={value} />
          ) : null;
        })}
        <button type="submit" className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]" aria-label={t("vocab.search")}>
          <Search size={17} />
        </button>
      </form>

      <div className="vocabulary-controls-row [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [&_.translation-switch]:[flex:0_1_auto] [&_.translation-switch]:[min-width:0] [&_.filter-builder]:[flex:0_0_auto]">
        <div className="translation-switch [display:inline-flex] [gap:3px] [padding:3px] [border:1px_solid_var(--border)] [border-radius:11px] [background:var(--surface)] [&_button]:[min-height:36px] [&_button]:[padding:0_10px] [&_button]:[border:0] [&_button]:[border-radius:8px] [&_button]:[background:transparent] [&_button]:[color:var(--text-muted)] [&_button]:[cursor:pointer] [&_button]:[font-size:0.72rem] [&_button]:[font-weight:650] [&_button.is-active]:[background:var(--surface-soft)] [&_button.is-active]:[color:var(--text)] [&_button:disabled]:[cursor:wait] [&_button:disabled]:[opacity:0.65]" aria-label={t("vocab.translationLanguage")}>
          {([["ENGLISH", "EN"], ["PERSIAN", "FA"]] as const).map(
            ([mode, label]) => (
              <button
                type="button"
                key={mode}
                className={language === mode ? "is-active" : ""}
                aria-pressed={language === mode}
                onClick={() => onLanguageChange(mode)}
              >
                {label}
              </button>
            ),
          )}
        </div>

        <div className="filter-builder [position:relative] [z-index:10]" ref={menuRef}>
          <div className="filter-add-anchor [position:relative] [display:inline-flex]">
            <button
              ref={addButtonRef}
              aria-expanded={menu !== null}
              className="filter-add-button [display:inline-flex] [align-items:center] [border:1px_solid_var(--border)] [border-radius:11px] [background:var(--surface-raised)] [color:var(--text-soft)] [font-size:0.78rem] [gap:7px] [padding:0_11px] [cursor:pointer] [transition:border-color_150ms_ease,_background_150ms_ease,_color_150ms_ease] [&:hover]:[border-color:rgba(167,_157,_255,_0.55)] [&:hover]:[background:var(--primary-soft)] [&:hover]:[color:var(--primary-strong)] [&[aria-expanded=true]]:[border-color:rgba(167,_157,_255,_0.55)] [&[aria-expanded=true]]:[background:var(--primary-soft)] [&[aria-expanded=true]]:[color:var(--primary-strong)] [flex:0_0_auto] [min-height:38px]"
              onClick={() => setMenu((currentMenu) => currentMenu ? null : "types")}
              type="button"
            >
              <Filter size={15} />
              {t("vocab.addFilter")}
            </button>

            {menu ? (
              <div
                className="filter-menu [position:absolute] [top:calc(100%_+_8px)] [left:0] [width:min(300px,_calc(100vw_-_32px))] [overflow:hidden] [padding:5px] [border:1px_solid_var(--border-strong)] [border-radius:15px] [background:var(--surface-raised)] [box-shadow:var(--shadow)] [animation:filter-menu-in_150ms_ease-out] max-[619px]:[z-index:80] max-[619px]:[max-height:min(62dvh,_520px)] max-[619px]:[overflow:auto] [overscroll-behavior:contain]"
                role="dialog"
                aria-label={t("vocab.filters")}
                style={{ insetInlineStart: menuOffset }}
              >
                {selectedFilter ? (
                  <>
                    <button className="filter-menu-back [width:100%] [min-height:40px] [display:flex] [align-items:center] [gap:8px] [padding:0_10px] [border:0] [background:transparent] [cursor:pointer] [font-size:0.82rem] [text-align:left] [border-bottom:1px_solid_var(--border)] [border-radius:0] [color:var(--text-muted)] [&:hover]:[outline:none] [&:hover]:[background:var(--surface-soft)] [&:hover]:[color:var(--text)] [&:focus-visible]:[outline:none] [&:focus-visible]:[background:var(--surface-soft)] [&:focus-visible]:[color:var(--text)]" onClick={() => setMenu("types")} type="button">
                      <ChevronLeft className="rtl-mirror" size={16} />
                      {selectedFilter.label}
                    </button>
                    <div className="filter-menu-list" role="listbox" aria-label={selectedFilter.label}>
                      {selectedFilter.options.map((option) => {
                        const isSelected = option.value === current[selectedFilter.key];
                        return (
                          <button
                            aria-selected={isSelected}
                            className={isSelected ? "filter-menu-option is-selected [width:100%] [display:flex] [align-items:center] [gap:8px] [padding:0_10px] [border:0] [border-radius:10px] [background:transparent] [color:var(--text-soft)] [cursor:pointer] [font-size:0.82rem] [text-align:left] [&:hover]:[outline:none] [&:hover]:[background:var(--surface-soft)] [&:hover]:[color:var(--text)] [&:focus-visible]:[outline:none] [&:focus-visible]:[background:var(--surface-soft)] [&:focus-visible]:[color:var(--text)] [&.is-selected]:[background:var(--primary-soft)] [&.is-selected]:[color:var(--text)] [&_span]:[margin-left:auto] [&_span]:[color:var(--primary-strong)] [&_span]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_span]:[font-size:0.64rem] [min-height:var(--tap-target)]" : "filter-menu-option [width:100%] [display:flex] [align-items:center] [gap:8px] [padding:0_10px] [border:0] [border-radius:10px] [background:transparent] [color:var(--text-soft)] [cursor:pointer] [font-size:0.82rem] [text-align:left] [&:hover]:[outline:none] [&:hover]:[background:var(--surface-soft)] [&:hover]:[color:var(--text)] [&:focus-visible]:[outline:none] [&:focus-visible]:[background:var(--surface-soft)] [&:focus-visible]:[color:var(--text)] [&.is-selected]:[background:var(--primary-soft)] [&.is-selected]:[color:var(--text)] [&_span]:[margin-left:auto] [&_span]:[color:var(--primary-strong)] [&_span]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_span]:[font-size:0.64rem] [min-height:var(--tap-target)]"}
                            key={option.value}
                            onClick={() => setParam(selectedFilter.key, option.value)}
                            role="option"
                            type="button"
                          >
                            {option.label}
                            {isSelected ? <span>{t("vocab.selected")}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="filter-menu-list" role="listbox" aria-label={t("vocab.filterTypes")}>
                    {filters.map((filter) => (
                      <button
                        aria-selected={!isDefaultValue(filter.key, current[filter.key])}
                        className="filter-menu-option [width:100%] [display:flex] [align-items:center] [gap:8px] [padding:0_10px] [border:0] [border-radius:10px] [background:transparent] [color:var(--text-soft)] [cursor:pointer] [font-size:0.82rem] [text-align:left] [&:hover]:[outline:none] [&:hover]:[background:var(--surface-soft)] [&:hover]:[color:var(--text)] [&:focus-visible]:[outline:none] [&:focus-visible]:[background:var(--surface-soft)] [&:focus-visible]:[color:var(--text)] [&.is-selected]:[background:var(--primary-soft)] [&.is-selected]:[color:var(--text)] [&_span]:[margin-left:auto] [&_span]:[color:var(--primary-strong)] [&_span]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_span]:[font-size:0.64rem] [min-height:var(--tap-target)]"
                        key={filter.key}
                        onClick={() => setMenu(filter.key)}
                        role="option"
                        type="button"
                      >
                        {filter.label}
                        {!isDefaultValue(filter.key, current[filter.key]) ? (
                          <span>{t("vocab.active")}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {activeFilters.length ? (
        <div className="filter-chip-row [align-items:center] [display:flex] [gap:7px] [flex-wrap:wrap] [padding-bottom:2px]" aria-label={t("vocab.activeFilters")}>
          {activeFilters.map((filter) => (
            <span className="filter-chip [display:inline-flex] [align-items:center] [border:1px_solid_var(--border)] [border-radius:11px] [background:var(--surface-raised)] [color:var(--text-soft)] [font-size:0.78rem] [overflow:hidden] [&_button]:[width:31px] [&_button]:[align-self:stretch] [&_button]:[display:grid] [&_button]:[place-items:center] [&_button]:[border:0] [&_button]:[border-left:1px_solid_var(--border)] [&_button]:[background:transparent] [&_button]:[color:var(--text-muted)] [&_button]:[cursor:pointer] [&_button:hover]:[color:var(--text)] [&_button:hover]:[background:var(--surface-soft)] [flex:0_0_auto] [min-height:38px]" key={filter.key}>
              <span className="filter-chip-type [align-self:stretch] [display:inline-flex] [align-items:center] [padding:0_9px] [border-right:1px_solid_var(--border)] [color:var(--text-muted)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.66rem]">{filter.label}</span>
              <span className="filter-chip-value [padding:0_8px] [color:var(--text)] [font-weight:600]">{filter.valueLabel}</span>
              <button
                aria-label={t("vocab.removeFilter", { label: filter.label })}
                onClick={() => setParam(filter.key, "ALL")}
                type="button"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {current.q || activeFilters.length ? (
        <button
          type="button"
          className="text-button library-clear [min-height:38px] [display:inline-flex] [align-items:center] [gap:6px] [border:0] [background:transparent] [color:var(--text-muted)] [cursor:pointer] [width:fit-content]"
          onClick={() => router.push("/vocabulary")}
        >
          <X size={15} />
          {t("vocab.clearFilters")}
        </button>
      ) : null}
    </section>
  );
}
