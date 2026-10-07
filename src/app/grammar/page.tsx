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
    <Link href={"/grammar/" + item.slug} className="grammar-concept-row [min-height:76px] [display:grid] [grid-template-columns:minmax(0,_1fr)_18px] [align-items:center] [gap:12px] [padding:11px_2px] [&_+_.grammar-concept-row]:[border-top:1px_solid_var(--border)] [&_>_svg]:[color:var(--text-muted)]">
      <div className="grammar-concept-main [min-width:0] [display:flex] [flex-direction:column] [gap:5px] [&_strong]:[font-size:0.92rem] [&_small]:[overflow:hidden] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.68rem] [&_small]:[line-height:1.4] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap]">
        <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
          <span className={"grammar-state [min-height:25px] [display:inline-flex] [align-items:center] [width:fit-content] [padding:0_8px] [border:1px_solid_var(--border)] [border-radius:999px] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.62rem] [color:var(--text-soft)] [background:var(--surface-raised)] [&.grammar-state-needs_attention]:[border-color:rgba(255,_107,_122,_0.28)] [&.grammar-state-needs_attention]:[color:#ffc2c9] [&.grammar-state-needs_attention]:[background:var(--danger-soft)] [&.grammar-state-learning]:[border-color:rgba(139,_124,_255,_0.28)] [&.grammar-state-learning]:[color:#d7d2ff] [&.grammar-state-learning]:[background:var(--primary-soft)] [&.grammar-state-strong]:[border-color:rgba(73,_201,_139,_0.25)] [&.grammar-state-strong]:[color:#b8f2d4] [&.grammar-state-strong]:[background:var(--success-soft)] [&.grammar-state-assumed]:[border-color:var(--border)] [&.grammar-state-assumed]:[color:var(--text-muted)] grammar-state-" + item.status.toLowerCase()}>
            {t(STATUS_LABEL_KEYS[item.status] ?? "grammar.status.unassessed")}
          </span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{item.introducedAt}</span>
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

  return <main className="page grammar-hub [display:flex] [flex-direction:column] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [gap:18px]">
    <PersistedFirstUseGuide
      userId={user.id}
      guide={FIRST_USE_GUIDES.grammar}
      title={t("guidance.grammar.title")}
      description={t("guidance.grammar.body")}
      items={[t("guidance.grammar.item1")]}
      dismissLabel={t("guidance.dismiss")}
    />
    <section className="grammar-hero [display:flex] [flex-direction:column] [gap:14px] [padding:14px_0_2px] [&_h1]:[margin:3px_0_0] [&_h1]:[max-width:820px] [&_h1]:[font-size:clamp(2.25rem,_11vw,_4.8rem)] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[flex-direction:row] min-[940px]:[align-items:end] min-[940px]:[justify-content:space-between]">
      <div>
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.eyebrow")}</p>
        <h1>{t("grammar.structure", { language: languageLabel })}</h1>
        <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("grammar.description")}</p>
      </div>
    </section>
    <div className="grammar-filter-strip [display:flex] [gap:7px] [overflow-x:auto] [padding-bottom:4px] [scrollbar-width:none] [&::-webkit-scrollbar]:[display:none] [&_a]:[flex:0_0_auto] [&_a]:[min-height:38px] [&_a]:[display:inline-flex] [&_a]:[align-items:center] [&_a]:[padding:0_11px] [&_a]:[border:1px_solid_var(--border)] [&_a]:[border-radius:999px] [&_a]:[color:var(--text-muted)] [&_a]:[background:var(--surface)] [&_a]:[font-size:0.7rem] [&_a.is-active]:[color:var(--text)] [&_a.is-active]:[border-color:var(--primary)] [&_a.is-active]:[background:var(--primary-soft)]" aria-label={t("grammar.filterLevel")}>
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
    <div className="grammar-summary [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [overflow:hidden] [border:1px_solid_var(--border)] [border-radius:16px] [background:var(--surface)] [&_>_div]:[min-height:72px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[justify-content:center] [&_>_div]:[gap:3px] [&_>_div]:[padding:11px_12px] [&_>_div:nth-child(even)]:[border-left:1px_solid_var(--border)] [&_>_div:nth-child(n_+_3)]:[border-top:1px_solid_var(--border)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:1.25rem] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.66rem] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] min-[620px]:[&_>_div:nth-child(n_+_3)]:[border-top:0] min-[620px]:[&_>_div_+_div]:[border-left:1px_solid_var(--border)]">{Array.from({ length: 4 }, (_, index) => <div className="skeleton loading-metric [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:68px] [border-radius:0]" key={index} />)}</div>
    <div className="skeleton-stack [display:flex] [flex-direction:column] [gap:12px]">{Array.from({ length: 5 }, (_, index) => <div className="skeleton loading-action-row [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:78px] [border-radius:14px]" key={index} />)}</div>
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
          className="grammar-level-path [width:fit-content] [display:flex] [align-items:center] [gap:10px] [padding:10px_12px] [border:1px_solid_var(--border)] [border-radius:15px] [background:var(--surface)] [&_>_span]:[display:flex] [&_>_span]:[flex-direction:column] [&_>_span]:[gap:1px] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.62rem] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:0.95rem] [&_>_svg]:[color:var(--text-muted)] min-[940px]:[margin-bottom:8px]"
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

      <section className="grammar-summary [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [overflow:hidden] [border:1px_solid_var(--border)] [border-radius:16px] [background:var(--surface)] [&_>_div]:[min-height:72px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[justify-content:center] [&_>_div]:[gap:3px] [&_>_div]:[padding:11px_12px] [&_>_div:nth-child(even)]:[border-left:1px_solid_var(--border)] [&_>_div:nth-child(n_+_3)]:[border-top:1px_solid_var(--border)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:1.25rem] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.66rem] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] min-[620px]:[&_>_div:nth-child(n_+_3)]:[border-top:0] min-[620px]:[&_>_div_+_div]:[border-left:1px_solid_var(--border)]" aria-label={t("grammar.summary")}>
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
        <div className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <strong>{t("grammar.notLoaded")}</strong>
          <span className="muted [color:var(--text-muted)]">{t("grammar.notLoadedHelp")}</span>
        </div>
      ) : null}

      {dashboard.needsAttention.length ? (
        <section className="page-section grammar-priority-section [display:flex] [flex-direction:column] [gap:12px] [&_.section-heading_>_svg]:[color:var(--danger)]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.needsAttentionEyebrow")}</p>
              <h2>{t("grammar.revisit")}</h2>
            </div>
            <CircleAlert size={20} />
          </div>
          <div className="grammar-list [display:flex] [flex-direction:column] [border-block:1px_solid_var(--border)]">
            {dashboard.needsAttention.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.learning.length ? (
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.continueEyebrow")}</p>
              <h2>{t("grammar.keepBuilding")}</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <div className="grammar-list [display:flex] [flex-direction:column] [border-block:1px_solid_var(--border)]">
            {dashboard.learning.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.recommended.length ? (
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.recommendedEyebrow")}</p>
              <h2>{t("grammar.ready")}</h2>
            </div>
            <Target size={20} />
          </div>
          <div className="grammar-list [display:flex] [flex-direction:column] [border-block:1px_solid_var(--border)]">
            {dashboard.recommended.map((item) => (
              <ConceptRow key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section grammar-curriculum [display:flex] [flex-direction:column] [gap:12px]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.curriculum")}</p>
            <h2>{t("grammar.browse")}</h2>
          </div>
          <GraduationCap size={20} />
        </div>

        <div className="grammar-category-strip [display:flex] [gap:7px] [overflow-x:auto] [padding-bottom:4px] [scrollbar-width:none] [&::-webkit-scrollbar]:[display:none] [&_a]:[flex:0_0_auto] [&_a]:[min-height:38px] [&_a]:[display:inline-flex] [&_a]:[align-items:center] [&_a]:[padding:0_11px] [&_a]:[border:1px_solid_var(--border)] [&_a]:[border-radius:999px] [&_a]:[color:var(--text-muted)] [&_a]:[background:var(--surface)] [&_a]:[font-size:0.7rem] [&_a.is-active]:[color:var(--text)] [&_a.is-active]:[border-color:var(--primary)] [&_a.is-active]:[background:var(--primary-soft)]" aria-label={t("grammar.filterCategory")}>
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

        <div className="grammar-list [display:flex] [flex-direction:column] [border-block:1px_solid_var(--border)]">
          {(selectedLevel || selectedCategory ? filtered : dashboard.sortedItems).map((item) => (
            <ConceptRow key={item.id} item={item} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}
