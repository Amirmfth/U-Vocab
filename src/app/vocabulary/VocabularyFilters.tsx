"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivitySelect, type ActivitySelectOption } from "@/components/ui/activity-select";

function withAll(label: string, values: Array<{ value: string; label: string }>): ActivitySelectOption[] {
  return [{ value: "ALL", label }, ...values];
}

export function VocabularyFilters({
  current,
  partOfSpeechOptions,
  levelOptions,
  topicOptions,
}: {
  current: {
    q: string;
    status: string;
    pos: string;
    level: string;
    topic: string;
    relation: string;
  };
  partOfSpeechOptions: Array<{ value: string; label: string }>;
  levelOptions: Array<{ value: string; label: string }>;
  topicOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") params.delete(key);
    else params.set(key, value);
    router.push("/vocabulary" + (params.toString() ? "?" + params.toString() : ""));
  }

  const statusOptions: ActivitySelectOption[] = [
    { value: "ALL", label: "All vocabulary" },
    { value: "NEW", label: "New" },
    { value: "LEARNING", label: "Learning" },
    { value: "WEAK", label: "Weak" },
    { value: "STRONG", label: "Strong" },
    { value: "MASTERED", label: "Mastered" },
    { value: "DUE", label: "Due" },
    { value: "RECENT", label: "Recently encountered" },
    { value: "DIFFICULT", label: "Difficult / forgotten" },
  ];

  const relationOptions: ActivitySelectOption[] = [
    { value: "ALL", label: "Any relationship" },
    { value: "WORD_FAMILY", label: "Has word family" },
    { value: "COLLOCATION", label: "Has collocations" },
    { value: "RELATED", label: "Has semantic relations" },
  ];

  return (
    <section className="library-tools">
      <form className="library-search" action="/vocabulary">
        <Search size={17} />
        <input
          name="q"
          defaultValue={current.q}
          placeholder="Search German, English, or Persian…"
          aria-label="Search vocabulary"
        />
        {current.status !== "ALL" ? <input type="hidden" name="status" value={current.status} /> : null}
        {current.pos !== "ALL" ? <input type="hidden" name="pos" value={current.pos} /> : null}
        {current.level !== "ALL" ? <input type="hidden" name="level" value={current.level} /> : null}
        {current.topic !== "ALL" ? <input type="hidden" name="topic" value={current.topic} /> : null}
        {current.relation !== "ALL" ? <input type="hidden" name="relation" value={current.relation} /> : null}
        <button type="submit" className="icon-button" aria-label="Search">
          <Search size={17} />
        </button>
      </form>

      <div className="library-filter-grid">
        <ActivitySelect
          key={"status-" + current.status}
          id="status"
          name="status"
          defaultValue={current.status}
          options={statusOptions}
          onValueChange={(value) => setParam("status", value)}
        />
        <ActivitySelect
          key={"pos-" + current.pos}
          id="pos"
          name="pos"
          defaultValue={current.pos}
          options={withAll("Any part of speech", partOfSpeechOptions)}
          onValueChange={(value) => setParam("pos", value)}
        />
        <ActivitySelect
          key={"level-" + current.level}
          id="level"
          name="level"
          defaultValue={current.level}
          options={withAll("Any CEFR level", levelOptions)}
          onValueChange={(value) => setParam("level", value)}
        />
        <ActivitySelect
          key={"topic-" + current.topic}
          id="topic"
          name="topic"
          defaultValue={current.topic}
          options={withAll("Any collection", topicOptions)}
          onValueChange={(value) => setParam("topic", value)}
        />
        <ActivitySelect
          key={"relation-" + current.relation}
          id="relation"
          name="relation"
          defaultValue={current.relation}
          options={relationOptions}
          onValueChange={(value) => setParam("relation", value)}
        />
      </div>

      {(current.q ||
        current.status !== "ALL" ||
        current.pos !== "ALL" ||
        current.level !== "ALL" ||
        current.topic !== "ALL" ||
        current.relation !== "ALL") ? (
        <button
          type="button"
          className="text-button library-clear"
          onClick={() => router.push("/vocabulary")}
        >
          <X size={15} />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
