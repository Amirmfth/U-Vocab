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
    <main className="page vocabulary-page">
      <VocabularyScrollRestoration />
      <section className="page-header compact library-header">
        <h1>{t("vocab.title")}</h1>
        <Link href="/vocabulary/new" className="button button-primary" prefetch>
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
    <div className="skeleton loading-list-count" />
    <div className="vocabulary-list">
      {Array.from({ length: 6 }, (_, index) => <div className="vocabulary-row loading-vocabulary-row" key={index} aria-hidden="true">
        <div className="vocabulary-row-main skeleton-stack"><div className="skeleton loading-row-word" /><div className="skeleton loading-row-translation" /></div>
        <div className="skeleton loading-row-meta" /><div className="skeleton loading-row-mastery" />
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
        ...word.outgoing.map((relation) => relation.target.lemma),
        ...word.incoming.map((relation) => relation.source.lemma),
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE");

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
        return a.lexeme.lemma.localeCompare(b.lexeme.lemma, "de");
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
      translations: word.translations.map(({ id, language, text }) => ({ id, language, text })),
      cefrLevel: word.cefrLevel,
      state: item.state,
      mastery,
      isDue: !item.nextReviewAt || dateTime(item.nextReviewAt) <= nowTime,
      isWeak: mastery < 45,
    };
  });

  return <VocabularyDisplay targetLanguage={targetLanguage} rows={rows} total={items.length} locale={locale} t={t} />;
}
