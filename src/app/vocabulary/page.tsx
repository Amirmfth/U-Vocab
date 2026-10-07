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
    <main className="page vocabulary-page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [&_.library-header]:[flex-direction:row] [&_.library-header]:[align-items:center] [&_.library-header]:[justify-content:space-between] [&_.library-header]:[gap:20px] [&_.library-header]:[padding-top:18px] [&_.library-header]:[padding-bottom:10px] [&_.library-header_h1]:[margin:0] [&_.library-header_h1]:[min-width:0] [&_.library-header_h1]:[font-size:clamp(1.65rem,_7vw,_3rem)] [&_.library-header_.button]:[width:auto] [&_.library-header_.button]:[flex:0_0_auto] [&_.library-header-actions]:[align-items:stretch] [&_.library-primary-actions]:[gap:8px] [&_.ia-subnav]:[padding-block:2px] [&_.library-tools]:[gap:10px] [&_.filter-chip-row]:[padding-bottom:4px] [&_.vocabulary-list]:[margin-top:2px] [&_.vocabulary-list]:[border-top-color:var(--border-strong)] [&_.vocabulary-row]:[min-height:82px] [&_.vocabulary-row]:[padding-block:14px] [&_.vocabulary-row]:[background:transparent] [&_.vocabulary-row]:[content-visibility:auto] [&_.vocabulary-row]:[contain-intrinsic-size:auto_82px] [&_.vocabulary-row]:[transition:background_140ms_ease,_border-color_140ms_ease,_transform_140ms_ease] [&_.vocabulary-row:nth-child(even)]:[background:transparent] [&_.vocabulary-row_.word]:[font-size:1.08rem] [&_.vocabulary-row_.word]:[font-weight:650] [&_.vocabulary-row_.word]:[letter-spacing:-0.025em] [&_.translation-line]:[margin-top:5px] [&_.translation-line_span]:[color:var(--text-soft)] [&_.translation-line_span]:[font-size:0.78rem] [&_.vocabulary-row-meta]:[min-width:78px] [&_.vocabulary-row-meta]:[gap:5px] [&_.vocabulary-row-meta_>_span:first-child]:[color:var(--text-muted)] [&_.vocabulary-row-meta_>_span:first-child]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_.vocabulary-row-meta_>_span:first-child]:[font-size:0.62rem] [&_.row-signal]:[border-color:var(--border-strong)] [&_.row-signal]:[background:rgba(255,_255,_255,_0.025)] [&_.vocabulary-row-meta_strong]:[margin-top:1px] [&_.vocabulary-row-meta_strong]:[color:var(--text)] [&_.vocabulary-row-meta_strong]:[font-size:0.7rem] [&_.mastery-line]:[opacity:0.82] min-[620px]:[&_.library-header-actions]:[align-items:flex-end] min-[620px]:[&_.vocabulary-row]:[min-height:88px] min-[620px]:[&_.vocabulary-row]:[padding:15px_10px] min-[940px]:[&_.library-header]:[padding-top:30px] min-[940px]:[&_.vocabulary-row]:[margin-inline:-12px] min-[940px]:[&_.vocabulary-row]:[padding-inline:12px] min-[940px]:[&_.vocabulary-row]:[border-bottom-color:rgba(42,42,49,0.78)] min-[940px]:[&_.vocabulary-row]:[border-radius:12px] min-[940px]:[&_.vocabulary-row:hover]:[z-index:1] min-[940px]:[&_.vocabulary-row:hover]:[border-color:transparent] min-[940px]:[&_.vocabulary-row:hover]:[background:var(--surface)] min-[940px]:[&_.vocabulary-row:hover]:[transform:translateX(2px)]">
      <VocabularyScrollRestoration />
      <section className="page-header compact library-header [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [display:flex] [flex-direction:column] [&_h1]:[margin-bottom:4px] [&.compact_h1]:[margin-bottom:4px] min-[620px]:[flex-direction:row] min-[620px]:[align-items:end] min-[620px]:[justify-content:space-between] min-[620px]:[&_.button]:[width:auto] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)] [max-width:none]">
        <h1>{t("vocab.title")}</h1>
        <Link href="/vocabulary/new" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" prefetch>
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
    <div className="skeleton loading-list-count [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:120px] [height:14px] [margin-top:2px]" />
    <div className="vocabulary-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
      {Array.from({ length: 6 }, (_, index) => <div className="vocabulary-row loading-vocabulary-row [&:nth-child(even)]:[background:rgb(22,_22,_22)] min-[940px]:[&:hover]:[background:var(--surface)] [position:relative] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [gap:8px_12px] [padding:12px_2px_13px] [border-bottom:1px_solid_var(--border)] [background:transparent] [&_.word]:[overflow:hidden] [&_.word]:[font-size:1.04rem] [&_.word]:[line-height:1.25] [&_.word]:[text-overflow:ellipsis] [&_.word]:[white-space:nowrap] [&_.mastery-line]:[grid-column:1_/_-1] [&_.mastery-line]:[height:3px] [&_.mastery-line]:[margin-top:-2px] [min-height:82px] [&_.skeleton-stack]:[gap:9px] min-[620px]:[min-height:84px] min-[620px]:[padding-inline:8px]" key={index} aria-hidden="true">
        <div className="vocabulary-row-main skeleton-stack [display:flex] [flex-direction:column] [gap:12px] [min-width:0]"><div className="skeleton loading-row-word [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(55vw,_220px)] [height:23px]" /><div className="skeleton loading-row-translation [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(45vw,_170px)] [height:14px]" /></div>
        <div className="skeleton loading-row-meta [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:88px] [height:17px]" /><div className="skeleton loading-row-mastery [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [grid-column:1_/_-1] [height:4px] [border-radius:999px]" />
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
