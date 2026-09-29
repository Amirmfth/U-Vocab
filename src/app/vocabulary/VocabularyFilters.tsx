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
    <section className="library-tools">
      <form className="library-search" action="/vocabulary">
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
        <button type="submit" className="icon-button" aria-label={t("vocab.search")}>
          <Search size={17} />
        </button>
      </form>

      <div className="vocabulary-controls-row">
        <div className="translation-switch" aria-label={t("vocab.translationLanguage")}>
          {([["ENGLISH", "EN"], ["PERSIAN", "FA"], ["BOTH", "EN+FA"]] as const).map(
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

        <div className="filter-builder" ref={menuRef}>
          <div className="filter-add-anchor">
            <button
              ref={addButtonRef}
              aria-expanded={menu !== null}
              className="filter-add-button"
              onClick={() => setMenu((currentMenu) => currentMenu ? null : "types")}
              type="button"
            >
              <Filter size={15} />
              {t("vocab.addFilter")}
            </button>

            {menu ? (
              <div
                className="filter-menu"
                role="dialog"
                aria-label={t("vocab.filters")}
                style={{ insetInlineStart: menuOffset }}
              >
                {selectedFilter ? (
                  <>
                    <button className="filter-menu-back" onClick={() => setMenu("types")} type="button">
                      <ChevronLeft className="rtl-mirror" size={16} />
                      {selectedFilter.label}
                    </button>
                    <div className="filter-menu-list" role="listbox" aria-label={selectedFilter.label}>
                      {selectedFilter.options.map((option) => {
                        const isSelected = option.value === current[selectedFilter.key];
                        return (
                          <button
                            aria-selected={isSelected}
                            className={isSelected ? "filter-menu-option is-selected" : "filter-menu-option"}
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
                        className="filter-menu-option"
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
        <div className="filter-chip-row" aria-label={t("vocab.activeFilters")}>
          {activeFilters.map((filter) => (
            <span className="filter-chip" key={filter.key}>
              <span className="filter-chip-type">{filter.label}</span>
              <span className="filter-chip-value">{filter.valueLabel}</span>
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
          className="text-button library-clear"
          onClick={() => router.push("/vocabulary")}
        >
          <X size={15} />
          {t("vocab.clearFilters")}
        </button>
      ) : null}
    </section>
  );
}
