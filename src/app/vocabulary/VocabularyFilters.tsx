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
      <form className="library-search min-h-12 uv-grid-template-columns-738a8da05d uv-padding-445dd0ce12 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface uv-vcf5ce320fa:min-h-11 uv-vcf5ce320fa:p-0 uv-vcf5ce320fa:border-0 uv-vcf5ce320fa:bg-transparent uv-vcf57ac372f:uv-box-shadow-71f8e7976e relative flex items-center gap-2 uv-v872d6ea02a:absolute uv-v872d6ea02a:left-3.25 uv-v872d6ea02a:uv-z-index-356a192b79 uv-v872d6ea02a:text-uv-text-muted uv-v144ec8229e:min-h-12 uv-v144ec8229e:pl-10 uv-v144ec8229e:pr-12 uv-v808eb306d1:min-h-12 uv-v808eb306d1:pl-10 uv-v808eb306d1:pr-12 uv-v907997862c:absolute uv-v907997862c:right-0.75 uv-v907997862c:w-10.5 uv-v907997862c:h-10.5 uv-v907997862c:min-h-10.5 uv-v907997862c:border-0 uv-v907997862c:bg-transparent" action="/vocabulary">
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
        <button type="submit" className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383" aria-label={t("vocab.search")}>
          <Search size={17} />
        </button>
      </form>

      <div className="vocabulary-controls-row flex items-center justify-between gap-2.5 uv-ve9ea81b080:uv-flex-b1519c2d12 uv-ve9ea81b080:min-w-0 uv-v82af058c60:uv-flex-18ba0b6e31">
        <div className="translation-switch inline-flex gap-0.75 p-0.75 uv-border-8d7f82f403 rounded-uv-r4bd46d4017 bg-uv-surface uv-v513a7112a0:min-h-9 uv-v513a7112a0:uv-padding-4d5c65a39c uv-v513a7112a0:border-0 uv-v513a7112a0:rounded-uv-r9bc5fefa1a uv-v513a7112a0:bg-transparent uv-v513a7112a0:text-uv-text-muted uv-v513a7112a0:cursor-pointer uv-v513a7112a0:text-uv-ff1713651e0 uv-v513a7112a0:uv-weight-650 uv-v169acfe1bb:bg-uv-surface-soft uv-v169acfe1bb:text-uv-text uv-v2497b722ae:cursor-wait uv-v2497b722ae:opacity-65" aria-label={t("vocab.translationLanguage")}>
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

        <div className="filter-builder relative uv-z-index-b1d5781111" ref={menuRef}>
          <div className="filter-add-anchor relative inline-flex">
            <button
              ref={addButtonRef}
              aria-expanded={menu !== null}
              className="filter-add-button inline-flex items-center uv-border-8d7f82f403 rounded-uv-r4bd46d4017 bg-uv-surface-raised text-uv-text-soft text-uv-fe9d5fd6635 gap-1.75 uv-padding-e76eae74a0 cursor-pointer uv-transition-2df24b8968 hover:border-uv-cfe2456a398 hover:bg-uv-cbdfd7cd038 hover:text-uv-primary-strong uv-vb90b783b8b:border-uv-cfe2456a398 uv-vb90b783b8b:bg-uv-cbdfd7cd038 uv-vb90b783b8b:text-uv-primary-strong uv-flex-18ba0b6e31 min-h-9.5"
              onClick={() => setMenu((currentMenu) => currentMenu ? null : "types")}
              type="button"
            >
              <Filter size={15} />
              {t("vocab.addFilter")}
            </button>

            {menu ? (
              <div
                className="filter-menu absolute uv-top-7278eb9a3e left-0 uv-width-07483bb933 overflow-hidden p-1.25 uv-border-488f4b382f rounded-uv-r344c386330 bg-uv-surface-raised uv-box-shadow-4ee177db8b uv-animation-b70179107c uv-max619:uv-z-index-b888b29826 uv-max619:uv-max-height-2e61becd04 uv-max619:overflow-auto overscroll-contain"
                role="dialog"
                aria-label={t("vocab.filters")}
                style={{ insetInlineStart: menuOffset }}
              >
                {selectedFilter ? (
                  <>
                    <button className="filter-menu-back w-full min-h-10 flex items-center gap-2 uv-padding-4d5c65a39c border-0 bg-transparent cursor-pointer text-uv-fa2582d5d6e text-left uv-border-bottom-8d7f82f403 rounded-none text-uv-text-muted hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text" onClick={() => setMenu("types")} type="button">
                      <ChevronLeft className="rtl-mirror" size={16} />
                      {selectedFilter.label}
                    </button>
                    <div className="filter-menu-list" role="listbox" aria-label={selectedFilter.label}>
                      {selectedFilter.options.map((option) => {
                        const isSelected = option.value === current[selectedFilter.key];
                        return (
                          <button
                            aria-selected={isSelected}
                            className={isSelected ? "filter-menu-option is-selected w-full flex items-center gap-2 uv-padding-4d5c65a39c border-0 rounded-uv-r933cc73310 bg-transparent text-uv-text-soft cursor-pointer text-uv-fa2582d5d6e text-left hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text uv-v48f8f87023:bg-uv-cbdfd7cd038 uv-v48f8f87023:text-uv-text uv-v36c0309a03:ml-auto uv-v36c0309a03:text-uv-primary-strong uv-v36c0309a03:uv-font-family-320794573f uv-v36c0309a03:text-uv-fbe567142e3 uv-min-height-e45618b383" : "filter-menu-option w-full flex items-center gap-2 uv-padding-4d5c65a39c border-0 rounded-uv-r933cc73310 bg-transparent text-uv-text-soft cursor-pointer text-uv-fa2582d5d6e text-left hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text uv-v48f8f87023:bg-uv-cbdfd7cd038 uv-v48f8f87023:text-uv-text uv-v36c0309a03:ml-auto uv-v36c0309a03:text-uv-primary-strong uv-v36c0309a03:uv-font-family-320794573f uv-v36c0309a03:text-uv-fbe567142e3 uv-min-height-e45618b383"}
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
                        className="filter-menu-option w-full flex items-center gap-2 uv-padding-4d5c65a39c border-0 rounded-uv-r933cc73310 bg-transparent text-uv-text-soft cursor-pointer text-uv-fa2582d5d6e text-left hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text uv-v48f8f87023:bg-uv-cbdfd7cd038 uv-v48f8f87023:text-uv-text uv-v36c0309a03:ml-auto uv-v36c0309a03:text-uv-primary-strong uv-v36c0309a03:uv-font-family-320794573f uv-v36c0309a03:text-uv-fbe567142e3 uv-min-height-e45618b383"
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
            <span className="filter-chip inline-flex items-center uv-border-8d7f82f403 rounded-uv-r4bd46d4017 bg-uv-surface-raised text-uv-text-soft text-uv-fe9d5fd6635 overflow-hidden uv-v513a7112a0:w-7.75 uv-v513a7112a0:self-stretch uv-v513a7112a0:grid uv-v513a7112a0:uv-place-items-305047e96e uv-v513a7112a0:border-0 uv-v513a7112a0:uv-border-left-8d7f82f403 uv-v513a7112a0:bg-transparent uv-v513a7112a0:text-uv-text-muted uv-v513a7112a0:cursor-pointer uv-v402c621420:text-uv-text uv-v402c621420:bg-uv-surface-soft uv-flex-18ba0b6e31 min-h-9.5" key={filter.key}>
              <span className="filter-chip-type self-stretch inline-flex items-center uv-padding-16c4636e97 uv-border-right-8d7f82f403 text-uv-text-muted uv-font-family-320794573f text-uv-ff7862da171">{filter.label}</span>
              <span className="filter-chip-value uv-padding-4f85d0e84d text-uv-text font-semibold">{filter.valueLabel}</span>
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
