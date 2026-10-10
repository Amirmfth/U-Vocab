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
    <Link href={"/grammar/" + item.slug} className="grammar-concept-row min-h-19 grid uv-grid-template-columns-085cc5c992 items-center gap-3 uv-padding-c9f5e3c335 uv-v0ace2e20ae:uv-border-top-8d7f82f403 uv-v872d6ea02a:text-uv-text-muted">
      <div className="grammar-concept-main min-w-0 flex flex-col gap-1.25 uv-veda02a0adb:text-uv-f1a79c6a094 uv-v982220ddd5:overflow-hidden uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-f78eb7000a9 uv-v982220ddd5:uv-line-height-a26f83404b uv-v982220ddd5:uv-text-overflow-900198081b uv-v982220ddd5:whitespace-nowrap">
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className={"grammar-state min-h-6.25 inline-flex items-center w-fit uv-padding-4f85d0e84d uv-border-8d7f82f403 rounded-uv-red9ab892c5 uv-font-family-320794573f text-uv-f174ef476a0 text-uv-text-soft bg-uv-surface-raised uv-v828a2a58d3:border-uv-c60009ca3c2 uv-v828a2a58d3:text-uv-c7d351e814d uv-v828a2a58d3:bg-uv-c8b3083dabe uv-vfcdc2edabe:border-uv-c85a9d06a78 uv-vfcdc2edabe:text-uv-c1d285c7551 uv-vfcdc2edabe:bg-uv-cbdfd7cd038 uv-v516803f730:border-uv-cad82869dd8 uv-v516803f730:text-uv-cf9ab83a8af uv-v516803f730:bg-uv-cafddaf6a65 uv-v9a6fa25db7:border-uv-border uv-v9a6fa25db7:text-uv-text-muted grammar-state-" + item.status.toLowerCase()}>
            {t(STATUS_LABEL_KEYS[item.status] ?? "grammar.status.unassessed")}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{item.introducedAt}</span>
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
    <section className="grammar-hero flex flex-col gap-3.5 uv-padding-2753259b77 uv-v3bccf64584:uv-margin-4dbe78398d uv-v3bccf64584:max-w-uv-d1f4d3e141 uv-v3bccf64584:text-uv-fdd704d9153 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:flex-row uv-min940:items-end uv-min940:justify-between">
      <div>
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.eyebrow")}</p>
        <h1>{t("grammar.structure", { language: languageLabel })}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("grammar.description")}</p>
      </div>
    </section>
    <div className="grammar-filter-strip flex gap-1.75 overflow-x-auto pb-1 uv-scrollbar-width-71f8e7976e uv-v41251afdab:hidden uv-v99777dc5b4:uv-flex-18ba0b6e31 uv-v99777dc5b4:min-h-9.5 uv-v99777dc5b4:inline-flex uv-v99777dc5b4:items-center uv-v99777dc5b4:uv-padding-e76eae74a0 uv-v99777dc5b4:uv-border-8d7f82f403 uv-v99777dc5b4:rounded-uv-red9ab892c5 uv-v99777dc5b4:text-uv-text-muted uv-v99777dc5b4:bg-uv-surface uv-v99777dc5b4:text-uv-f58b84cc6f5 uv-v556e8b75d1:text-uv-text uv-v556e8b75d1:border-uv-primary uv-v556e8b75d1:bg-uv-cbdfd7cd038" aria-label={t("grammar.filterLevel")}>
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
    <div className="grammar-summary grid uv-grid-template-columns-dd0b1a1848 overflow-hidden uv-border-8d7f82f403 rounded-uv-r4678bd4d8a bg-uv-surface uv-vcbb57f4d35:min-h-18 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:justify-center uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:uv-padding-611e03324b uv-v0f841b75f7:uv-border-left-8d7f82f403 uv-v21edbb0ef8:uv-border-top-8d7f82f403 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f081acf2896 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff7862da171 uv-min620:uv-grid-template-columns-0cbc4f103a uv-min620:uv-v21edbb0ef8:uv-border-top-b6589fc6ab uv-min620:uv-v5007062a75:uv-border-left-8d7f82f403">{Array.from({ length: 4 }, (_, index) => <div className="skeleton loading-metric uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17 rounded-none" key={index} />)}</div>
    <div className="skeleton-stack flex flex-col gap-3">{Array.from({ length: 5 }, (_, index) => <div className="skeleton loading-action-row uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-19.5 rounded-uv-rd65225386d" key={index} />)}</div>
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
          className="grammar-level-path w-fit flex items-center gap-2.5 uv-padding-df857c6c31 uv-border-8d7f82f403 rounded-uv-r344c386330 bg-uv-surface uv-v22810335d8:flex uv-v22810335d8:flex-col uv-v22810335d8:gap-0.25 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-f174ef476a0 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f691a6c8013 uv-v872d6ea02a:text-uv-text-muted uv-min940:mb-2"
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

      <section className="grammar-summary grid uv-grid-template-columns-dd0b1a1848 overflow-hidden uv-border-8d7f82f403 rounded-uv-r4678bd4d8a bg-uv-surface uv-vcbb57f4d35:min-h-18 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:justify-center uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:uv-padding-611e03324b uv-v0f841b75f7:uv-border-left-8d7f82f403 uv-v21edbb0ef8:uv-border-top-8d7f82f403 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f081acf2896 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff7862da171 uv-min620:uv-grid-template-columns-0cbc4f103a uv-min620:uv-v21edbb0ef8:uv-border-top-b6589fc6ab uv-min620:uv-v5007062a75:uv-border-left-8d7f82f403" aria-label={t("grammar.summary")}>
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
        <div className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <strong>{t("grammar.notLoaded")}</strong>
          <span className="muted text-uv-text-muted">{t("grammar.notLoadedHelp")}</span>
        </div>
      ) : null}

      {dashboard.needsAttention.length ? (
        <section className="page-section grammar-priority-section flex flex-col gap-3 uv-v7d1288f8ff:text-uv-danger">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.needsAttentionEyebrow")}</p>
              <h2>{t("grammar.revisit")}</h2>
            </div>
            <CircleAlert size={20} />
          </div>
          <div className="grammar-list flex flex-col uv-border-block-8d7f82f403">
            {dashboard.needsAttention.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.learning.length ? (
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.continueEyebrow")}</p>
              <h2>{t("grammar.keepBuilding")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <div className="grammar-list flex flex-col uv-border-block-8d7f82f403">
            {dashboard.learning.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.recommended.length ? (
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.recommendedEyebrow")}</p>
              <h2>{t("grammar.ready")}</h2>
            </div>
            <Target size={20} />
          </div>
          <div className="grammar-list flex flex-col uv-border-block-8d7f82f403">
            {dashboard.recommended.map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section grammar-curriculum flex flex-col gap-3">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.curriculum")}</p>
            <h2>{t("grammar.browse")}</h2>
          </div>
          <GraduationCap size={20} />
        </div>

        <div className="grammar-category-strip flex gap-1.75 overflow-x-auto pb-1 uv-scrollbar-width-71f8e7976e uv-v41251afdab:hidden uv-v99777dc5b4:uv-flex-18ba0b6e31 uv-v99777dc5b4:min-h-9.5 uv-v99777dc5b4:inline-flex uv-v99777dc5b4:items-center uv-v99777dc5b4:uv-padding-e76eae74a0 uv-v99777dc5b4:uv-border-8d7f82f403 uv-v99777dc5b4:rounded-uv-red9ab892c5 uv-v99777dc5b4:text-uv-text-muted uv-v99777dc5b4:bg-uv-surface uv-v99777dc5b4:text-uv-f58b84cc6f5 uv-v556e8b75d1:text-uv-text uv-v556e8b75d1:border-uv-primary uv-v556e8b75d1:bg-uv-cbdfd7cd038" aria-label={t("grammar.filterCategory")}>
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

        <div className="grammar-list flex flex-col uv-border-block-8d7f82f403">
          {(selectedLevel || selectedCategory ? filtered : dashboard.sortedItems).map((item) => (
            <ConceptRow key={item.id} item={item} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}
