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
    <Link href={"/grammar/" + item.slug} className="grammar-concept-row">
      <div className="grammar-concept-main">
        <div className="word-meta">
          <span className={"grammar-state grammar-state-" + item.status.toLowerCase()}>
            {t(STATUS_LABEL_KEYS[item.status] ?? "grammar.status.unassessed")}
          </span>
          <span className="badge">{item.introducedAt}</span>
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

  return <main className="page grammar-hub">
    <PersistedFirstUseGuide
      userId={user.id}
      guide={FIRST_USE_GUIDES.grammar}
      title={t("guidance.grammar.title")}
      description={t("guidance.grammar.body")}
      items={[t("guidance.grammar.item1")]}
      dismissLabel={t("guidance.dismiss")}
    />
    <section className="grammar-hero">
      <div>
        <p className="eyebrow">{t("grammar.eyebrow")}</p>
        <h1>{t("grammar.structure", { language: languageLabel })}</h1>
        <p className="page-description">{t("grammar.description")}</p>
      </div>
    </section>
    <div className="grammar-filter-strip" aria-label={t("grammar.filterLevel")}>
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
    <div className="grammar-summary">{Array.from({ length: 4 }, (_, index) => <div className="skeleton loading-metric" key={index} />)}</div>
    <div className="skeleton-stack">{Array.from({ length: 5 }, (_, index) => <div className="skeleton loading-action-row" key={index} />)}</div>
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
          className="grammar-level-path"
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

      <section className="grammar-summary" aria-label={t("grammar.summary")}>
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
        <div className="empty-state compact-empty">
          <strong>{t("grammar.notLoaded")}</strong>
          <span className="muted">{t("grammar.notLoadedHelp")}</span>
        </div>
      ) : null}

      {dashboard.needsAttention.length ? (
        <section className="page-section grammar-priority-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.needsAttentionEyebrow")}</p>
              <h2>{t("grammar.revisit")}</h2>
            </div>
            <CircleAlert size={20} />
          </div>
          <div className="grammar-list">
            {dashboard.needsAttention.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.learning.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.continueEyebrow")}</p>
              <h2>{t("grammar.keepBuilding")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <div className="grammar-list">
            {dashboard.learning.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.recommended.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.recommendedEyebrow")}</p>
              <h2>{t("grammar.ready")}</h2>
            </div>
            <Target size={20} />
          </div>
          <div className="grammar-list">
            {dashboard.recommended.map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section grammar-curriculum">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("grammar.curriculum")}</p>
            <h2>{t("grammar.browse")}</h2>
          </div>
          <GraduationCap size={20} />
        </div>

        <div className="grammar-category-strip" aria-label={t("grammar.filterCategory")}>
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

        <div className="grammar-list">
          {(selectedLevel || selectedCategory ? filtered : dashboard.sortedItems).map((item) => (
            <ConceptRow key={item.id} item={item} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}
