"use client";

import { ChevronLeft, Filter, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterKey = "status" | "pos" | "level" | "topic" | "relation" | "sort";

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

export function VocabularyFilters({
  current,
  partOfSpeechOptions,
  levelOptions,
  topicOptions,
}: {
  current: Record<FilterKey | "q", string>;
  partOfSpeechOptions: FilterOption[];
  levelOptions: FilterOption[];
  topicOptions: FilterOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menu, setMenu] = useState<"types" | FilterKey | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters: FilterDefinition[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "ALL", label: "All vocabulary" },
        { value: "NEW", label: "New" },
        { value: "LEARNING", label: "Learning" },
        { value: "WEAK", label: "Weak" },
        { value: "STRONG", label: "Strong" },
        { value: "MASTERED", label: "Mastered" },
        { value: "DUE", label: "Due" },
        { value: "RECENT", label: "Recently encountered" },
        { value: "DIFFICULT", label: "Difficult / forgotten" },
      ],
    },
    { key: "pos", label: "Part of speech", options: withAll("Any part of speech", partOfSpeechOptions) },
    { key: "level", label: "CEFR level", options: withAll("Any CEFR level", levelOptions) },
    { key: "topic", label: "Topic", options: withAll("Any topic", topicOptions) },
    {
      key: "sort",
      label: "Sort",
      options: [
        { value: "RECENTLY_ADDED", label: "Recently added" },
        { value: "ALPHABETICAL", label: "Alphabetical A–Z" },
        { value: "CEFR_ASC", label: "CEFR A1 → C2" },
        { value: "CEFR_DESC", label: "CEFR C2 → A1" },
        { value: "MASTERY_ASC", label: "Lowest mastery first" },
        { value: "MASTERY_DESC", label: "Highest mastery first" },
        { value: "NEXT_REVIEW", label: "Next review first" },
      ],
    },
    {
      key: "relation",
      label: "Relationship",
      options: [
        { value: "ALL", label: "Any relationship" },
        { value: "WORD_FAMILY", label: "Has word family" },
        { value: "COLLOCATION", label: "Has collocations" },
        { value: "RELATED", label: "Has semantic relations" },
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

  function setParam(key: FilterKey, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault = value === "ALL" || (key === "sort" && value === "RECENTLY_ADDED");
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
    if (
      current[filter.key] === "ALL" ||
      (filter.key === "sort" && current.sort === "RECENTLY_ADDED")
    ) return [];
    const option = filter.options.find((item) => item.value === current[filter.key]);
    return option ? [{ ...filter, valueLabel: option.label }] : [];
  });

  const selectedFilter = typeof menu === "string" && menu !== "types"
    ? filters.find((filter) => filter.key === menu)
    : null;

  return (
    <section className="library-tools">
      <form className="library-search" action="/vocabulary">
        <input
          name="q"
          defaultValue={current.q}
          onChange={(event) => updateSearch(event.currentTarget.value)}
          placeholder="Search German, English, or Persian…"
          aria-label="Search vocabulary"
        />
        {filters.map((filter) => {
          const value = current[filter.key];
          const isDefault = value === "ALL" || (filter.key === "sort" && value === "RECENTLY_ADDED");
          return !isDefault ? (
            <input key={filter.key} type="hidden" name={filter.key} value={value} />
          ) : null;
        })}
        <button type="submit" className="icon-button" aria-label="Search">
          <Search size={17} />
        </button>
      </form>

      <div className="filter-builder" ref={menuRef}>
        <div className="filter-chip-row" aria-label="Active vocabulary filters">
          {activeFilters.map((filter) => (
            <span className="filter-chip" key={filter.key}>
              <span className="filter-chip-type">{filter.label}</span>
              <span className="filter-chip-value">{filter.valueLabel}</span>
              <button
                aria-label={`Remove ${filter.label} filter`}
                onClick={() => setParam(filter.key, "ALL")}
                type="button"
              >
                <X size={14} />
              </button>
            </span>
          ))}

          <button
            aria-expanded={menu !== null}
            className="filter-add-button"
            onClick={() => setMenu((currentMenu) => currentMenu ? null : "types")}
            type="button"
          >
            <Filter size={15} />
            Add filter
          </button>
        </div>

        {menu ? (
          <div className="filter-menu" role="dialog" aria-label="Vocabulary filters">
            {selectedFilter ? (
              <>
                <button className="filter-menu-back" onClick={() => setMenu("types")} type="button">
                  <ChevronLeft size={16} />
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
                        {isSelected ? <span>Selected</span> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="filter-menu-list" role="listbox" aria-label="Filter types">
                {filters.map((filter) => (
                  <button
                    aria-selected={current[filter.key] !== "ALL"}
                    className="filter-menu-option"
                    key={filter.key}
                    onClick={() => setMenu(filter.key)}
                    role="option"
                    type="button"
                  >
                    {filter.label}
                    {current[filter.key] !== "ALL" ? <span>Active</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {(current.q || activeFilters.length) ? (
        <button type="button" className="text-button library-clear" onClick={() => router.push("/vocabulary")}>
          <X size={15} />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
