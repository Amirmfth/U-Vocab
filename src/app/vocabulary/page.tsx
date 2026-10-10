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
    <main className="page vocabulary-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full uv-ve9b43fefd2:flex-row uv-ve9b43fefd2:items-center uv-ve9b43fefd2:justify-between uv-ve9b43fefd2:gap-5 uv-ve9b43fefd2:pt-4.5 uv-ve9b43fefd2:pb-2.5 uv-v427d4df5e9:m-0 uv-v427d4df5e9:min-w-0 uv-v427d4df5e9:text-uv-f92222c0123 uv-v3b1ff6c754:w-auto uv-v3b1ff6c754:uv-flex-18ba0b6e31 uv-v3c1ca792ad:items-stretch uv-vce61ff6a19:gap-2 uv-v4e3567fcca:py-0.5 uv-v8d1fad19a2:gap-2.5 uv-v7a3dfd5686:pb-1 uv-v92ffc916c6:mt-0.5 uv-v92ffc916c6:border-t-uv-border-strong uv-v880449fe3c:min-h-20.5 uv-v880449fe3c:py-3.5 uv-v880449fe3c:bg-transparent uv-v880449fe3c:uv-content-visibility-0d612c12d2 uv-v880449fe3c:uv-contain-intrinsic-size-b479074074 uv-v880449fe3c:uv-transition-dd530514b0 uv-v704a476013:bg-transparent uv-v5e3a24e7cd:text-uv-f44eab8f17b uv-v5e3a24e7cd:uv-weight-650 uv-v5e3a24e7cd:uv-letter-spacing-8b899f0f19 uv-v3adb96cf0c:mt-1.25 uv-vfab421b27f:text-uv-text-soft uv-vfab421b27f:text-uv-fe9d5fd6635 uv-v6a940edaf0:min-w-19.5 uv-v6a940edaf0:gap-1.25 uv-v91aa083d31:text-uv-text-muted uv-v91aa083d31:uv-font-family-320794573f uv-v91aa083d31:text-uv-f174ef476a0 uv-v3ccf9121ca:border-uv-border-strong uv-v3ccf9121ca:bg-uv-c7ef9eb4aa9 uv-vfe7b5e7ea0:mt-0.25 uv-vfe7b5e7ea0:text-uv-text uv-vfe7b5e7ea0:text-uv-f58b84cc6f5 uv-vc89072ee13:opacity-82 uv-min620:uv-v3c1ca792ad:items-end uv-min620:uv-v880449fe3c:min-h-22 uv-min620:uv-v880449fe3c:uv-padding-c33d677ea2 uv-min940:uv-ve9b43fefd2:pt-7.5 uv-min940:uv-v880449fe3c:-mx-3 uv-min940:uv-v880449fe3c:px-3 uv-min940:uv-v880449fe3c:border-b-uv-c651b85d40c uv-min940:uv-v880449fe3c:rounded-uv-r0939007802 uv-min940:uv-v30cd3666b6:uv-z-index-356a192b79 uv-min940:uv-v30cd3666b6:border-transparent uv-min940:uv-v30cd3666b6:bg-uv-surface uv-min940:uv-v30cd3666b6:uv-transform-96bdae476f">
      <VocabularyScrollRestoration />
      <section className="page-header compact library-header uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 flex flex-col uv-v3bccf64584:mb-1 uv-v3faa105aea:mb-1 uv-min620:flex-row uv-min620:items-end uv-min620:justify-between uv-min620:uv-vcded88c612:w-auto gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade max-w-none">
        <h1>{t("vocab.title")}</h1>
        <Link href="/vocabulary/new" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" prefetch>
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
    <div className="skeleton loading-list-count rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-30 h-3.5 mt-0.5" />
    <div className="vocabulary-list flex flex-col uv-border-top-8d7f82f403">
      {Array.from({ length: 6 }, (_, index) => <div className="vocabulary-row loading-vocabulary-row uv-v4af6d61843:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative grid uv-grid-template-columns-f06dd92ea5 uv-gap-e4accf4b2b uv-padding-9e55c755a1 uv-border-bottom-8d7f82f403 bg-transparent uv-va00727a60e:overflow-hidden uv-va00727a60e:text-uv-f2862aaf96f uv-va00727a60e:uv-line-height-8e007eaa50 uv-va00727a60e:uv-text-overflow-900198081b uv-va00727a60e:whitespace-nowrap uv-vc89072ee13:uv-grid-column-93b665dfb5 uv-vc89072ee13:h-0.75 uv-vc89072ee13:-mt-0.5 min-h-20.5 uv-v422d23500e:gap-2.25 uv-min620:min-h-21 uv-min620:px-2" key={index} aria-hidden="true">
        <div className="vocabulary-row-main skeleton-stack flex flex-col gap-3 min-w-0"><div className="skeleton loading-row-word rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-b523d09d0b h-5.75" /><div className="skeleton loading-row-translation rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-0bc6c66b27 h-3.5" /></div>
        <div className="skeleton loading-row-meta rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22 h-4.25" /><div className="skeleton loading-row-mastery uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-grid-column-93b665dfb5 h-1 rounded-uv-red9ab892c5" />
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
