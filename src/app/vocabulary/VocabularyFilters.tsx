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
    <section className="library-tools flex flex-col gap-2">
      <form className="library-search min-h-12 grid-template-columns-auto-minmax-0-1fr-auto padding-0-8px-0-13px border-1px-solid-border-2 rounded-exact-14px bg-uv-surface in-input:min-h-11 in-input:p-0 in-input:border-0 in-input:bg-transparent in-input-focus:box-shadow-none relative flex items-center gap-2 in-svg:absolute in-svg:left-3.25 in-svg:z-index-1 in-svg:text-uv-text-muted in-input-type-text:min-h-12 in-input-type-text:pl-10 in-input-type-text:pr-12 in-input-name-q:min-h-12 in-input-name-q:pl-10 in-input-name-q:pr-12 in-icon-button:absolute in-icon-button:right-0.75 in-icon-button:w-10.5 in-icon-button:h-10.5 in-icon-button:min-h-10.5 in-icon-button:border-0 in-icon-button:bg-transparent" action="/vocabulary">
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
        <button type="submit" className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-exact-13px bg-uv-surface text-uv-text-soft min-height-tap-target" aria-label={t("vocab.search")}>
          <Search size={17} />
        </button>
      </form>

      <div className="vocabulary-controls-row flex items-center justify-between gap-2.5 in-translation-switch:flex-0-1-auto in-translation-switch:min-w-0 in-filter-builder:flex-0-0-auto">
        <div className="translation-switch inline-flex gap-0.75 p-0.75 border-1px-solid-border-2 rounded-exact-11px bg-uv-surface in-button-3:min-h-9 in-button-3:padding-0-10px in-button-3:border-0 in-button-3:rounded-exact-8px in-button-3:bg-transparent in-button-3:text-uv-text-muted in-button-3:cursor-pointer in-button-3:text-exact-0p72rem in-button-3:font-650 in-button-is-active:bg-uv-surface-soft in-button-is-active:text-uv-text in-button-disabled-2:cursor-wait in-button-disabled-2:opacity-65" aria-label={t("vocab.translationLanguage")}>
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

        <div className="filter-builder relative z-index-10" ref={menuRef}>
          <div className="filter-add-anchor relative inline-flex">
            <button
              ref={addButtonRef}
              aria-expanded={menu !== null}
              className="filter-add-button inline-flex items-center border-1px-solid-border-2 rounded-exact-11px bg-uv-surface-raised text-uv-text-soft text-exact-0p78rem gap-1.75 padding-0-11px cursor-pointer transition-border-color-150ms-ease-background-150ms-ease-color hover:border-uv-cfe2456a398 hover:bg-uv-cbdfd7cd038 hover:text-uv-primary-strong in-aria-expanded-true:border-uv-cfe2456a398 in-aria-expanded-true:bg-uv-cbdfd7cd038 in-aria-expanded-true:text-uv-primary-strong flex-0-0-auto min-h-9.5"
              onClick={() => setMenu((currentMenu) => currentMenu ? null : "types")}
              type="button"
            >
              <Filter size={15} />
              {t("vocab.addFilter")}
            </button>

            {menu ? (
              <div
                className="filter-menu absolute top-calc-100pct-8px left-0 width-min-300px-calc-100vw-32px overflow-hidden p-1.25 border-1px-solid-border-strong rounded-exact-15px bg-uv-surface-raised box-shadow-shadow animation-filter-menu-in-150ms-ease-out uv-max619:z-index-80 uv-max619:max-height-min-62dvh-520px uv-max619:overflow-auto overscroll-contain"
                role="dialog"
                aria-label={t("vocab.filters")}
                style={{ insetInlineStart: menuOffset }}
              >
                {selectedFilter ? (
                  <>
                    <button className="filter-menu-back w-full min-h-10 flex items-center gap-2 padding-0-10px border-0 bg-transparent cursor-pointer text-exact-0p82rem text-left border-1px-solid-border rounded-none text-uv-text-muted hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text" onClick={() => setMenu("types")} type="button">
                      <ChevronLeft className="rtl-mirror" size={16} />
                      {selectedFilter.label}
                    </button>
                    <div className="filter-menu-list" role="listbox" aria-label={selectedFilter.label}>
                      {selectedFilter.options.map((option) => {
                        const isSelected = option.value === current[selectedFilter.key];
                        return (
                          <button
                            aria-selected={isSelected}
                            className={isSelected ? "filter-menu-option is-selected w-full flex items-center gap-2 padding-0-10px border-0 rounded-exact-10px bg-transparent text-uv-text-soft cursor-pointer text-exact-0p82rem text-left hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text in-is-selected:bg-uv-cbdfd7cd038 in-is-selected:text-uv-text in-span:ml-auto in-span:text-uv-primary-strong in-span:font-font-geist-mono-geist-mono-monospace in-span:text-exact-0p64rem min-height-tap-target" : "filter-menu-option w-full flex items-center gap-2 padding-0-10px border-0 rounded-exact-10px bg-transparent text-uv-text-soft cursor-pointer text-exact-0p82rem text-left hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text in-is-selected:bg-uv-cbdfd7cd038 in-is-selected:text-uv-text in-span:ml-auto in-span:text-uv-primary-strong in-span:font-font-geist-mono-geist-mono-monospace in-span:text-exact-0p64rem min-height-tap-target"}
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
                        className="filter-menu-option w-full flex items-center gap-2 padding-0-10px border-0 rounded-exact-10px bg-transparent text-uv-text-soft cursor-pointer text-exact-0p82rem text-left hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text in-is-selected:bg-uv-cbdfd7cd038 in-is-selected:text-uv-text in-span:ml-auto in-span:text-uv-primary-strong in-span:font-font-geist-mono-geist-mono-monospace in-span:text-exact-0p64rem min-height-tap-target"
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
        <div className="filter-chip-row items-center flex gap-1.75 flex-wrap pb-0.5" aria-label={t("vocab.activeFilters")}>
          {activeFilters.map((filter) => (
            <span className="filter-chip inline-flex items-center border-1px-solid-border-2 rounded-exact-11px bg-uv-surface-raised text-uv-text-soft text-exact-0p78rem overflow-hidden in-button-3:w-7.75 in-button-3:self-stretch in-button-3:grid in-button-3:place-items-center in-button-3:border-0 in-button-3:border-1px-solid-border-5 in-button-3:bg-transparent in-button-3:text-uv-text-muted in-button-3:cursor-pointer in-button-hover:text-uv-text in-button-hover:bg-uv-surface-soft flex-0-0-auto min-h-9.5" key={filter.key}>
              <span className="filter-chip-type self-stretch inline-flex items-center padding-0-9px border-1px-solid-border-4 text-uv-text-muted font-font-geist-mono-geist-mono-monospace text-exact-0p66rem">{filter.label}</span>
              <span className="filter-chip-value padding-0-8px text-uv-text font-semibold">{filter.valueLabel}</span>
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
          className="text-button library-clear min-h-9.5 inline-flex items-center gap-1.5 border-0 bg-transparent text-uv-text-muted cursor-pointer w-fit"
          onClick={() => router.push("/vocabulary")}
        >
          <X size={15} />
          {t("vocab.clearFilters")}
        </button>
      ) : null}
    </section>
  );
}
