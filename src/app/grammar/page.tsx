import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CircleAlert,
  GraduationCap,
  Target,
} from "lucide-react";
import type { CefrLevel, GrammarCategory } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { getGrammarDashboard } from "@/lib/grammar/dashboard";
import { CEFR_LEVELS } from "@/lib/grammar/levels";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import type { MessageKey, Translator } from "@/i18n/core";
import { PersistedFirstUseGuide } from "@/components/PersistedFirstUseGuide";
import { FIRST_USE_GUIDES } from "@/lib/first-use-guidance";

const CATEGORY_LABEL_KEYS: Record<GrammarCategory, MessageKey> = {
  SENTENCE_STRUCTURE: "grammar.category.sentence_structure",
  CASES: "grammar.category.cases",
  VERBS: "grammar.category.verbs",
  TENSES: "grammar.category.tenses",
  ARTICLES: "grammar.category.articles",
  ADJECTIVES: "grammar.category.adjectives",
  PREPOSITIONS: "grammar.category.prepositions",
  PRONOUNS: "grammar.category.pronouns",
  CONJUNCTIONS: "grammar.category.conjunctions",
  RELATIVE_CLAUSES: "grammar.category.relative_clauses",
  NEGATION: "grammar.category.negation",
  COMPARISON: "grammar.category.comparison",
  PASSIVE: "grammar.category.passive",
  SUBJUNCTIVE: "grammar.category.subjunctive",
  INFINITIVE_CONSTRUCTIONS: "grammar.category.infinitive_constructions",
  NOUNS: "grammar.category.nouns",
  ADVERBS_PARTICLES: "grammar.category.adverbs_particles",
  WORD_FORMATION: "grammar.category.word_formation",
};

const STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  UNASSESSED: "grammar.status.unassessed",
  ASSUMED: "grammar.status.assumed",
  LEARNING: "grammar.status.learning",
  STRONG: "grammar.status.strong",
  NEEDS_ATTENTION: "grammar.status.needs_attention",
};

function ConceptRow({
  item,
  t,
}: {
  item: Awaited<ReturnType<typeof getGrammarDashboard>>["items"][number];
  t: Translator;
}) {
  return (
    <Link href={"/grammar/" + item.slug} className="grammar-concept-row min-h-19 grid grid-template-columns-minmax-0-1fr-18px items-center gap-3 padding-11px-2px in-grammar-concept-row:border-1px-solid-border-3 in-svg:text-uv-text-muted">
      <div className="grammar-concept-main min-w-0 flex flex-col gap-1.25 in-strong-2:text-exact-0p92rem in-small:overflow-hidden in-small:text-uv-text-muted in-small:text-exact-0p68rem in-small:line-height-1p4 in-small:text-overflow-ellipsis in-small:whitespace-nowrap">
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className={"grammar-state min-h-6.25 inline-flex items-center w-fit padding-0-8px border-1px-solid-border-2 rounded-exact-999px font-font-geist-mono-geist-mono-monospace text-exact-0p62rem text-uv-text-soft bg-uv-surface-raised in-grammar-state-needs-attention:border-uv-c60009ca3c2 in-grammar-state-needs-attention:text-uv-c7d351e814d in-grammar-state-needs-attention:bg-uv-c8b3083dabe in-grammar-state-learning:border-uv-c85a9d06a78 in-grammar-state-learning:text-uv-c1d285c7551 in-grammar-state-learning:bg-uv-cbdfd7cd038 in-grammar-state-strong:border-uv-cad82869dd8 in-grammar-state-strong:text-uv-cf9ab83a8af in-grammar-state-strong:bg-uv-cafddaf6a65 in-grammar-state-assumed:border-uv-border in-grammar-state-assumed:text-uv-text-muted grammar-state-" + item.status.toLowerCase()}>
            {t(STATUS_LABEL_KEYS[item.status] ?? "grammar.status.unassessed")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{item.introducedAt}</span>
        </div>
        <strong lang="en" dir="ltr" className="learning-content">{item.title}</strong>
        <small lang="en" dir="ltr" className="learning-content">{item.shortDescription}</small>
      </div>
      <ArrowRight className="rtl-mirror" size={17} aria-hidden="true" />
    </Link>
  );
}

export default async function GrammarPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; category?: string }>;
}) {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const language = targetLanguageConfig(course.targetLanguage);
  const languageLabel =
    course.targetLanguage === "GERMAN" ? t("common.german") : language.label;
  const params = await searchParams;

  return <main className="page grammar-hub flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 gap-4.5">
    <PersistedFirstUseGuide
      userId={user.id}
      guide={FIRST_USE_GUIDES.grammar}
      title={t("guidance.grammar.title")}
      description={t("guidance.grammar.body")}
      items={[t("guidance.grammar.item1")]}
      dismissLabel={t("guidance.dismiss")}
    />
    <section className="grammar-hero flex flex-col gap-3.5 padding-14px-0-2px in-h1:margin-3px-0-0 in-h1:max-w-uv-d1f4d3e141 in-h1:text-exact-clamp-2p25rem-11vw-4p8rem in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:flex-row uv-min940:items-end uv-min940:justify-between">
      <div>
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("grammar.eyebrow")}</p>
        <h1>{t("grammar.structure", { language: languageLabel })}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("grammar.description")}</p>
      </div>
    </section>
    <div className="grammar-filter-strip flex gap-1.75 overflow-x-auto pb-1 scrollbar-width-none in-webkit-scrollbar:hidden in-a:flex-0-0-auto in-a:min-h-9.5 in-a:inline-flex in-a:items-center in-a:padding-0-11px in-a:border-1px-solid-border-2 in-a:rounded-exact-999px in-a:text-uv-text-muted in-a:bg-uv-surface in-a:text-exact-0p7rem in-a-is-active:text-uv-text in-a-is-active:border-uv-primary in-a-is-active:bg-uv-cbdfd7cd038" aria-label={t("grammar.filterLevel")}>
      <Link href="/grammar" className={!params.level && !params.category ? "is-active" : ""}>{t("grammar.all")}</Link>
      {CEFR_LEVELS.map((level) => <Link key={level} href={"/grammar?level=" + level} className={params.level === level ? "is-active" : ""}>{level}</Link>)}
    </div>
    <Suspense key={`${params.level ?? ""}:${params.category ?? ""}`} fallback={<GrammarDashboardLoading label={t("loading.surface", { surface: t("nav.grammar") })} />}>
      <GrammarDashboardContent userId={user.id} courseId={course.id} params={params} locale={locale} t={t} languageLabel={languageLabel} />
    </Suspense>
  </main>;
}

function GrammarDashboardLoading({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label}>
    <div className="grammar-summary grid grid-template-columns-repeat-2-minmax-0-1fr overflow-hidden border-1px-solid-border-2 rounded-exact-16px bg-uv-surface in-div:min-h-18 in-div:flex in-div:flex-col in-div:justify-center in-div:gap-0.75 in-div:padding-11px-12px in-div-nth-child-even:border-1px-solid-border-5 in-div-nth-child-n-3:border-1px-solid-border-3 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-1p25rem in-span:text-uv-text-muted in-span:text-exact-0p66rem uv-min620:grid-template-columns-repeat-4-minmax-0-1fr uv-min620:in-div-nth-child-n-3:border-0 uv-min620:in-div-div:border-1px-solid-border-5">{Array.from({ length: 4 }, (_, index) => <div className="skeleton loading-metric bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17 rounded-none" key={index} />)}</div>
    <div className="skeleton-stack flex flex-col gap-3">{Array.from({ length: 5 }, (_, index) => <div className="skeleton loading-action-row bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-19.5 rounded-exact-14px" key={index} />)}</div>
  </div>;
}

async function GrammarDashboardContent({ userId, courseId, params, locale, t, languageLabel }: {
  userId: string;
  courseId: string;
  params: { level?: string; category?: string };
  locale: Awaited<ReturnType<typeof getServerTranslator>>["locale"];
  t: Translator;
  languageLabel: string;
}) {
  const dashboard = await getGrammarDashboard(userId, courseId);

  const selectedLevel = CEFR_LEVELS.includes(params.level as CefrLevel)
    ? (params.level as CefrLevel)
    : null;
  const selectedCategory = dashboard.categories.includes(
    params.category as GrammarCategory,
  )
    ? (params.category as GrammarCategory)
    : null;

  const filtered = dashboard.items.filter(
    (item) =>
      (!selectedLevel || item.introducedAt === selectedLevel) &&
      (!selectedCategory || item.category === selectedCategory),
  );

  return (
    <>
        <div
          className="grammar-level-path w-fit flex items-center gap-2.5 padding-10px-12px border-1px-solid-border-2 rounded-exact-15px bg-uv-surface in-span-2:flex in-span-2:flex-col in-span-2:gap-0.25 in-small:text-uv-text-muted in-small:text-exact-0p62rem in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-0p95rem in-svg:text-uv-text-muted uv-min940:mb-2"
          aria-label={t("grammar.levelPath", { language: languageLabel })}
        >
          <span>
            <small>{t("grammar.current")}</small>
            <strong>{dashboard.currentLevel}</strong>
          </span>
          <ArrowRight className="rtl-mirror" size={18} aria-hidden="true" />
          <span>
            <small>{t("grammar.target")}</small>
            <strong>{dashboard.targetLevel}</strong>
          </span>
        </div>

      <section className="grammar-summary grid grid-template-columns-repeat-2-minmax-0-1fr overflow-hidden border-1px-solid-border-2 rounded-exact-16px bg-uv-surface in-div:min-h-18 in-div:flex in-div:flex-col in-div:justify-center in-div:gap-0.75 in-div:padding-11px-12px in-div-nth-child-even:border-1px-solid-border-5 in-div-nth-child-n-3:border-1px-solid-border-3 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-1p25rem in-span:text-uv-text-muted in-span:text-exact-0p66rem uv-min620:grid-template-columns-repeat-4-minmax-0-1fr uv-min620:in-div-nth-child-n-3:border-0 uv-min620:in-div-div:border-1px-solid-border-5" aria-label={t("grammar.summary")}>
        <div>
          <strong>{formatNumber(locale, dashboard.counts.NEEDS_ATTENTION)}</strong>
          <span>{t("grammar.needsAttention")}</span>
        </div>
        <div>
          <strong>{formatNumber(locale, dashboard.counts.LEARNING)}</strong>
          <span>{t("grammar.learning")}</span>
        </div>
        <div>
          <strong>{formatNumber(locale, dashboard.counts.STRONG)}</strong>
          <span>{t("grammar.strong")}</span>
        </div>
        <div>
          <strong>{formatNumber(locale, dashboard.counts.ASSUMED)}</strong>
          <span>{t("grammar.assumed")}</span>
        </div>
      </section>

      {!dashboard.items.length ? (
        <div className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-exact-radius-lg text-uv-text-soft p-4.25">
          <strong>{t("grammar.notLoaded")}</strong>
          <span className="muted text-uv-text-muted">{t("grammar.notLoadedHelp")}</span>
        </div>
      ) : null}

      {dashboard.needsAttention.length ? (
        <section className="page-section grammar-priority-section flex flex-col gap-3 in-section-heading-svg:text-uv-danger">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("grammar.needsAttentionEyebrow")}</p>
              <h2>{t("grammar.revisit")}</h2>
            </div>
            <CircleAlert size={20} />
          </div>
          <div className="grammar-list flex flex-col border-1px-solid-border-6">
            {dashboard.needsAttention.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.learning.length ? (
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("grammar.continueEyebrow")}</p>
              <h2>{t("grammar.keepBuilding")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <div className="grammar-list flex flex-col border-1px-solid-border-6">
            {dashboard.learning.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.recommended.length ? (
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("grammar.recommendedEyebrow")}</p>
              <h2>{t("grammar.ready")}</h2>
            </div>
            <Target size={20} />
          </div>
          <div className="grammar-list flex flex-col border-1px-solid-border-6">
            {dashboard.recommended.map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section grammar-curriculum flex flex-col gap-3">
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("grammar.curriculum")}</p>
            <h2>{t("grammar.browse")}</h2>
          </div>
          <GraduationCap size={20} />
        </div>

        <div className="grammar-category-strip flex gap-1.75 overflow-x-auto pb-1 scrollbar-width-none in-webkit-scrollbar:hidden in-a:flex-0-0-auto in-a:min-h-9.5 in-a:inline-flex in-a:items-center in-a:padding-0-11px in-a:border-1px-solid-border-2 in-a:rounded-exact-999px in-a:text-uv-text-muted in-a:bg-uv-surface in-a:text-exact-0p7rem in-a-is-active:text-uv-text in-a-is-active:border-uv-primary in-a-is-active:bg-uv-cbdfd7cd038" aria-label={t("grammar.filterCategory")}>
          {dashboard.categories.map((category) => (
            <Link
              key={category}
              href={"/grammar?category=" + category}
              className={selectedCategory === category ? "is-active" : ""}
            >
              {t(CATEGORY_LABEL_KEYS[category])}
            </Link>
          ))}
        </div>

        <div className="grammar-list flex flex-col border-1px-solid-border-6">
          {(selectedLevel || selectedCategory ? filtered : dashboard.sortedItems).map((item) => (
            <ConceptRow key={item.id} item={item} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}
