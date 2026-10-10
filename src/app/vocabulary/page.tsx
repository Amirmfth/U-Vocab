import { PartOfSpeech, type RelationType } from "@prisma/client";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { currentRetrievability } from "@/lib/fsrs";
import { VocabularyScrollRestoration } from "./VocabularyScrollRestoration";
import { connection } from "next/server";
import { getCachedVocabularyLibrary } from "@/lib/cached-data";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { VocabularyDisplay } from "./VocabularyDisplay";
import { VocabularyControls } from "./VocabularyControls";
import { getServerTranslator } from "@/i18n/server";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function dateTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export default async function Vocabulary({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    pos?: string;
    level?: string;
    relation?: string;
    sort?: string;
  }>;
}) {
  await connection();
  const [user, course, query] = await Promise.all([getCurrentUser(), getCurrentCourse(), searchParams]);
  const language = targetLanguageConfig(course.targetLanguage);
  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const nowTime = now.getTime();
  const recentCutoffTime = recentCutoff.getTime();

  const current = {
    q: (query.q ?? "").trim(),
    status: query.status ?? "ALL",
    pos: query.pos ?? "ALL",
    level: query.level ?? "ALL",
    relation: query.relation ?? "ALL",
    sort: query.sort ?? "RECENTLY_ADDED",
  };

  const { locale, t } = await getServerTranslator(user);
  const partOfSpeechOptions = Object.values(PartOfSpeech).map((value) => ({
    value,
    label: value.replaceAll("_", " ").toLowerCase(),
  }));

  return (
    <main className="page vocabulary-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full in-library-header:flex-row in-library-header:items-center in-library-header:justify-between in-library-header:gap-5 in-library-header:pt-4.5 in-library-header:pb-2.5 in-library-header-h1:m-0 in-library-header-h1:min-w-0 in-library-header-h1:text-uv-f92222c0123 in-library-header-button:w-auto in-library-header-button:flex-0-0-auto in-library-header-actions:items-stretch in-library-primary-actions:gap-2 in-ia-subnav:py-0.5 in-library-tools:gap-2.5 in-filter-chip-row:pb-1 in-vocabulary-list:mt-0.5 in-vocabulary-list:border-t-uv-border-strong in-vocabulary-row:min-h-20.5 in-vocabulary-row:py-3.5 in-vocabulary-row:bg-transparent in-vocabulary-row:content-visibility-auto in-vocabulary-row:contain-intrinsic-size-auto-82px in-vocabulary-row:transition-background-140ms-ease-border-color-140ms-ease-transf in-vocabulary-row-nth-child-even:bg-transparent in-vocabulary-row-word:text-uv-f44eab8f17b in-vocabulary-row-word:font-650 in-vocabulary-row-word:letter-spacing-0p025em in-translation-line:mt-1.25 in-translation-line-span:text-uv-text-soft in-translation-line-span:text-uv-fe9d5fd6635 in-vocabulary-row-meta:min-w-19.5 in-vocabulary-row-meta:gap-1.25 in-vocabulary-row-meta-span-first-child:text-uv-text-muted in-vocabulary-row-meta-span-first-child:font-font-geist-mono-geist-mono-monospace in-vocabulary-row-meta-span-first-child:text-uv-f174ef476a0 in-row-signal:border-uv-border-strong in-row-signal:bg-uv-c7ef9eb4aa9 in-vocabulary-row-meta-strong:mt-0.25 in-vocabulary-row-meta-strong:text-uv-text in-vocabulary-row-meta-strong:text-uv-f58b84cc6f5 in-mastery-line:opacity-82 uv-min620:in-library-header-actions:items-end uv-min620:in-vocabulary-row:min-h-22 uv-min620:in-vocabulary-row:padding-15px-10px uv-min940:in-library-header:pt-7.5 uv-min940:in-vocabulary-row:-mx-3 uv-min940:in-vocabulary-row:px-3 uv-min940:in-vocabulary-row:border-b-uv-c651b85d40c uv-min940:in-vocabulary-row:rounded-uv-r0939007802 uv-min940:in-vocabulary-row-hover:z-index-1 uv-min940:in-vocabulary-row-hover:border-transparent uv-min940:in-vocabulary-row-hover:bg-uv-surface uv-min940:in-vocabulary-row-hover:transform-translatex-2px">
      <VocabularyScrollRestoration />
      <section className="page-header compact library-header padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 flex flex-col in-h1:mb-1 in-compact-h1:mb-1 uv-min620:flex-row uv-min620:items-end uv-min620:justify-between uv-min620:in-button-2:w-auto gap-2 pt-4 in-h1:text-uv-fce2aeaeade max-w-none">
        <h1>{t("vocab.title")}</h1>
        <Link href="/vocabulary/new" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" prefetch>
          <Plus size={18} />
          {t("nav.addWord")}
        </Link>
      </section>
      <VocabularyControls
        preferredTranslation={course.explanationLanguage}
        current={current}
        partOfSpeechOptions={partOfSpeechOptions}
        levelOptions={LEVELS.map((level) => ({ value: level, label: level }))}
      >
        <Suspense key={JSON.stringify(current)} fallback={<VocabularyListLoading label={t("loading.surface", { surface: t("vocab.title") })} />}>
          <VocabularyList userId={user.id} courseId={course.id} targetLanguage={language.code} current={current} nowTime={nowTime} recentCutoffTime={recentCutoffTime} locale={locale} t={t} />
        </Suspense>
      </VocabularyControls>
    </main>
  );
}

function VocabularyListLoading({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label}>
    <div className="skeleton loading-list-count rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-30 h-3.5 mt-0.5" />
    <div className="vocabulary-list flex flex-col border-1px-solid-border-3">
      {Array.from({ length: 6 }, (_, index) => <div className="vocabulary-row loading-vocabulary-row in-nth-child-even:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative grid grid-template-columns-minmax-0-1fr-auto gap-8px-12px padding-12px-2px-13px border-1px-solid-border bg-transparent in-word:overflow-hidden in-word:text-uv-f2862aaf96f in-word:line-height-1p25 in-word:text-overflow-ellipsis in-word:whitespace-nowrap in-mastery-line:grid-column-1-1 in-mastery-line:h-0.75 in-mastery-line:-mt-0.5 min-h-20.5 in-skeleton-stack:gap-2.25 uv-min620:min-h-21 uv-min620:px-2" key={index} aria-hidden="true">
        <div className="vocabulary-row-main skeleton-stack flex flex-col gap-3 min-w-0"><div className="skeleton loading-row-word rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-55vw-220px h-5.75" /><div className="skeleton loading-row-translation rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-45vw-170px h-3.5" /></div>
        <div className="skeleton loading-row-meta rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22 h-4.25" /><div className="skeleton loading-row-mastery bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite grid-column-1-1 h-1 rounded-uv-red9ab892c5" />
      </div>)}
    </div>
  </div>;
}

async function VocabularyList({ userId, courseId, targetLanguage, current, nowTime, recentCutoffTime, locale, t }: {
  userId: string;
  courseId: string;
  targetLanguage: "de" | "fr" | "en";
  current: { q: string; status: string; pos: string; level: string; relation: string; sort: string };
  nowTime: number;
  recentCutoffTime: number;
  locale: Awaited<ReturnType<typeof getServerTranslator>>["locale"];
  t: Awaited<ReturnType<typeof getServerTranslator>>["t"];
}) {

  const items = await getCachedVocabularyLibrary(userId, courseId);

  const normalizedQuery = current.q.toLocaleLowerCase(targetLanguage === "de" ? "de-DE" : targetLanguage === "fr" ? "fr-FR" : "en-US");

  const filtered = items.filter((item) => {
    const word = item.lexeme;
    const mastery =
      (item.recognition +
        item.meaningRecall +
        item.production +
        item.contextualUsage) /
      4;

    if (normalizedQuery) {
      const searchable = [
        word.lemma,
        ...word.translations.map((translation) => translation.text),
        ...word.definitions.map((definition) => definition.text),
        ...word.outgoing.map((relation) => relation.target.lemma),
        ...word.incoming.map((relation) => relation.source.lemma),
      ]
        .join(" ")
        .toLocaleLowerCase(targetLanguage === "de" ? "de-DE" : targetLanguage === "fr" ? "fr-FR" : "en-US");

      if (!searchable.includes(normalizedQuery)) return false;
    }

    if (current.pos !== "ALL" && word.partOfSpeech !== current.pos) return false;

    if (
      current.level !== "ALL" &&
      word.cefrLevel !== current.level
    ) {
      return false;
    }

    if (current.relation !== "ALL") {
      const relationTypes = new Set([
        ...word.outgoing.map((relation) => relation.type),
        ...word.incoming.map((relation) => relation.type),
      ]);

      if (
        current.relation === "WORD_FAMILY" &&
        !relationTypes.has("WORD_FAMILY") &&
        !relationTypes.has("DERIVED")
      ) {
        return false;
      }

      if (
        current.relation === "COLLOCATION" &&
        !relationTypes.has("COLLOCATION")
      ) {
        return false;
      }

      if (
        current.relation === "RELATED" &&
        !["RELATED", "SYNONYM", "ANTONYM", "PHRASE"].some((type) =>
          relationTypes.has(type as RelationType),
        )
      ) {
        return false;
      }
    }

    switch (current.status) {
      case "NEW":
        return item.state === "NEW";
      case "LEARNING":
        return ["LEARNING", "FAMILIAR", "ACTIVE"].includes(item.state);
      case "WEAK":
        return mastery < 0.45;
      case "STRONG":
        return mastery >= 0.75 && !["MASTERED", "MAINTENANCE"].includes(item.state);
      case "MASTERED":
        return ["MASTERED", "MAINTENANCE"].includes(item.state);
      case "DUE":
        return !item.nextReviewAt || dateTime(item.nextReviewAt) <= nowTime;
      case "RECENT":
        return Boolean(
          word.encounters[0] && dateTime(word.encounters[0].createdAt) >= recentCutoffTime,
        );
      case "DIFFICULT": {
        const retrievability = item.fsrsCard
          ? currentRetrievability(item.fsrsCard)
          : 1;
        return (item.difficulty ?? 0) >= 7 || retrievability < 0.7;
      }
      default:
        return true;
    }
  });

  const cefrRank = new Map(LEVELS.map((level, index) => [level, index]));
  const masteryOf = (item: (typeof items)[number]) =>
    (item.recognition + item.meaningRecall + item.production + item.contextualUsage) / 4;

  const sorted = [...filtered].sort((a, b) => {
    switch (current.sort) {
      case "ALPHABETICAL":
        return a.lexeme.lemma.localeCompare(b.lexeme.lemma, targetLanguage);
      case "CEFR_ASC":
        return (cefrRank.get(a.lexeme.cefrLevel ?? "") ?? 99) -
          (cefrRank.get(b.lexeme.cefrLevel ?? "") ?? 99);
      case "CEFR_DESC":
        return (cefrRank.get(b.lexeme.cefrLevel ?? "") ?? -1) -
          (cefrRank.get(a.lexeme.cefrLevel ?? "") ?? -1);
      case "MASTERY_ASC":
        return masteryOf(a) - masteryOf(b);
      case "MASTERY_DESC":
        return masteryOf(b) - masteryOf(a);
      case "NEXT_REVIEW":
        return (a.nextReviewAt ? dateTime(a.nextReviewAt) : 0) -
          (b.nextReviewAt ? dateTime(b.nextReviewAt) : 0);
      default:
        return dateTime(b.addedAt) - dateTime(a.addedAt);
    }
  });

  const rows = sorted.map((item) => {
    const word = item.lexeme;
    const mastery = Math.round(
      ((item.recognition + item.meaningRecall + item.production + item.contextualUsage) / 4) * 100,
    );
    return {
      id: word.id,
      label: formatLexemeLabel(word),
      meanings: [
        ...word.translations
          .filter((item) => item.language !== targetLanguage)
          .map(({ id, language, text }) => ({ id, language, text, kind: "translation" as const })),
        ...word.definitions
          .filter((item) => item.language === targetLanguage)
          .map(({ id, language, text }) => ({ id, language, text, kind: "definition" as const })),
      ],
      cefrLevel: word.cefrLevel,
      state: item.state,
      mastery,
      isDue: !item.nextReviewAt || dateTime(item.nextReviewAt) <= nowTime,
      isWeak: mastery < 45,
    };
  });

  return <VocabularyDisplay targetLanguage={targetLanguage} rows={rows} total={items.length} locale={locale} t={t} />;
}
