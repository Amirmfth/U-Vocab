import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { CefrLevel, GrammarCategory, GrammarProgressStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { UiLocale } from "@/i18n/config";
import { createTranslator, type MessageKey } from "@/i18n/core";
import { formatNumber } from "@/i18n/format";

const statusKeys: Record<GrammarProgressStatus, MessageKey> = {
  STRONG: "progress.grammar.status.strong",
  LEARNING: "progress.grammar.status.learning",
  NEEDS_ATTENTION: "progress.grammar.status.needsAttention",
  ASSUMED: "progress.grammar.status.assumed",
  UNASSESSED: "progress.grammar.status.unassessed",
};

const categoryKeys: Record<GrammarCategory, MessageKey> = {
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

const evidenceSourceKeys: Record<string, MessageKey> = {
  PRACTICE: "grammar.detail.source.practice",
  WRITING: "grammar.detail.source.writing",
  READING_COMPREHENSION: "grammar.detail.source.reading_comprehension",
  CONVERSATION: "grammar.detail.source.conversation",
  MANUAL: "grammar.detail.source.manual",
};

const outcomeKeys: Record<string, MessageKey> = {
  SUCCESS: "grammar.detail.outcome.success",
  ERROR: "grammar.detail.outcome.error",
  OPPORTUNITY: "grammar.detail.outcome.opportunity",
  ENCOUNTER: "grammar.detail.outcome.encounter",
};

export async function GrammarProgressPanel({
  userId,
  userCourseId,
  currentLevel,
  targetLevel,
  locale,
  compact = false,
}: {
  userId: string;
  userCourseId: string;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  locale: UiLocale;
  compact?: boolean;
}) {
  const t = createTranslator(locale);
  const [progress, mistakes, recentEvidence, transitions] = await Promise.all([
    db.userGrammarProgress.findMany({
      where: { userCourseId },
      include: { grammarConcept: true },
      orderBy: { grammarConcept: { order: "asc" } },
    }),
    db.mistake.groupBy({
      by: ["grammarConceptId"],
      where: {
        userCourseId,
        resolvedAt: null,
        grammarConceptId: { not: null },
      },
      _sum: { occurrences: true },
    }),
    db.grammarEvidence.findMany({
      where: { userId, userCourseId, accepted: true },
      include: {
        grammarConcept: {
          select: { slug: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.grammarProgressTransition.findMany({
      where: { userCourseId },
      include: {
        grammarConcept: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const counts = new Map<string, number>();
  for (const item of progress) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  const mistakeCounts = new Map(
    mistakes
      .filter((item) => item.grammarConceptId)
      .map((item) => [
        item.grammarConceptId as string,
        item._sum.occurrences ?? 0,
      ]),
  );
  const weaknesses = progress
    .filter(
      (item) =>
        item.status === "NEEDS_ATTENTION" ||
        (mistakeCounts.get(item.grammarConceptId) ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        (mistakeCounts.get(b.grammarConceptId) ?? 0) -
        (mistakeCounts.get(a.grammarConceptId) ?? 0),
    )
    .slice(0, 5);

  const statusSummary = (items: typeof progress) => {
    const summary = new Map<string, number>();
    for (const item of items) {
      summary.set(item.status, (summary.get(item.status) ?? 0) + 1);
    }
    return summary;
  };

  const byLevel = Array.from(
    new Set(progress.map((item) => item.grammarConcept.introducedAt)),
  )
    .sort(
      (a, b) =>
        ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(a) -
        ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(b),
    )
    .map((level) => ({
      label: level,
      summary: statusSummary(
        progress.filter((item) => item.grammarConcept.introducedAt === level),
      ),
      total: progress.filter(
        (item) => item.grammarConcept.introducedAt === level,
      ).length,
    }));

  const byCategory = Array.from(
    new Set(progress.map((item) => item.grammarConcept.category)),
  )
    .map((category) => ({
      category,
      summary: statusSummary(
        progress.filter((item) => item.grammarConcept.category === category),
      ),
      total: progress.filter(
        (item) => item.grammarConcept.category === category,
      ).length,
    }))
    .sort(
      (a, b) =>
        (b.summary.get("NEEDS_ATTENTION") ?? 0) -
          (a.summary.get("NEEDS_ATTENTION") ?? 0) ||
        t(categoryKeys[a.category]).localeCompare(
          t(categoryKeys[b.category]),
          locale,
        ),
    );

  const demonstrated = progress.filter(
    (item) => item.source === "EVIDENCE" && item.evidenceCount > 0,
  ).length;
  const assumed = progress.filter((item) => item.status === "ASSUMED").length;

  function breakdown(summary: Map<string, number>) {
    return t("progress.grammar.breakdown", {
      strong: formatNumber(locale, summary.get("STRONG") ?? 0),
      learning: formatNumber(locale, summary.get("LEARNING") ?? 0),
      attention: formatNumber(locale, summary.get("NEEDS_ATTENTION") ?? 0),
    });
  }

  return (
    <section className="panel grammar-progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:18px] [margin-bottom:22px] [border-radius:18px]">
      <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.grammar.eyebrow")}</p>
          <h2>
            {currentLevel} → {targetLevel}
          </h2>
        </div>
        <GraduationCap size={20} />
      </div>

      <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">{t("progress.grammar.description")}</p>

      <div className="grammar-progress-status-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:8px] [&_>_div]:[display:grid] [&_>_div]:[gap:3px] [&_>_div]:[padding:12px] [&_>_div]:[border:1px_solid_var(--border)] [&_>_div]:[border-radius:12px] [&_strong]:[font-size:1.2rem] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.72rem] min-[620px]:[grid-template-columns:repeat(5,_minmax(0,_1fr))]">
        {(
          [
            "STRONG",
            "LEARNING",
            "NEEDS_ATTENTION",
            "ASSUMED",
            "UNASSESSED",
          ] as const
        ).map((status) => (
          <div key={status}>
            <strong>{formatNumber(locale, counts.get(status) ?? 0)}</strong>
            <span>{t(statusKeys[status])}</span>
          </div>
        ))}
      </div>

      <div className="grammar-progress-evidence [color:var(--text-muted)] [font-size:0.72rem] [display:flex] [flex-wrap:wrap] [gap:12px]">
        <span>
          <strong>{formatNumber(locale, demonstrated)}</strong>{" "}
          {t("progress.grammar.demonstrated", {
            count: formatNumber(locale, demonstrated),
          }).replace(formatNumber(locale, demonstrated), "").trim()}
        </span>
        <span>
          <strong>{formatNumber(locale, assumed)}</strong>{" "}
          {t("progress.grammar.assumed", {
            count: formatNumber(locale, assumed),
          }).replace(formatNumber(locale, assumed), "").trim()}
        </span>
      </div>

      {!compact && byLevel.length ? (
        <div className="grammar-progress-section [display:grid] [gap:10px] [&_h3]:[margin:0] [&_h3]:[font-size:0.86rem]">
          <h3>{t("progress.grammar.byLevel")}</h3>
          <div className="grammar-profile-breakdown [display:grid] [gap:8px] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1fr)_auto] [&_>_div]:[gap:3px_10px] [&_>_div]:[padding:10px_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_strong]:[text-transform:capitalize] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.7rem] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.7rem] [&_small]:[grid-column:1_/_-1]">
            {byLevel.map((group) => (
              <div key={group.label}>
                <strong>{group.label}</strong>
                <span>
                  {t("progress.grammar.concepts", {
                    count: formatNumber(locale, group.total),
                  })}
                </span>
                <small>{breakdown(group.summary)}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && byCategory.length ? (
        <div className="grammar-progress-section [display:grid] [gap:10px] [&_h3]:[margin:0] [&_h3]:[font-size:0.86rem]">
          <h3>{t("progress.grammar.byCategory")}</h3>
          <div className="grammar-profile-breakdown [display:grid] [gap:8px] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:minmax(0,_1fr)_auto] [&_>_div]:[gap:3px_10px] [&_>_div]:[padding:10px_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_strong]:[text-transform:capitalize] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.7rem] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.7rem] [&_small]:[grid-column:1_/_-1]">
            {byCategory.map((group) => (
              <div key={group.category}>
                <strong>{t(categoryKeys[group.category])}</strong>
                <span>
                  {t("progress.grammar.concepts", {
                    count: formatNumber(locale, group.total),
                  })}
                </span>
                <small>{breakdown(group.summary)}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && weaknesses.length ? (
        <div className="grammar-progress-section [display:grid] [gap:10px] [&_h3]:[margin:0] [&_h3]:[font-size:0.86rem]">
          <h3>{t("progress.grammar.needsAttention")}</h3>
          <div className="collection-list [display:flex] [flex-direction:column]">
            {weaknesses.map((item) => (
              <Link
                className="collection-row [border-bottom:1px_solid_var(--border)] [min-height:64px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [align-items:center] [gap:12px] [padding:11px_2px] [&_strong]:[display:block] [&_span]:[display:block] [&_span]:[margin-top:3px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.76rem] min-[940px]:[&:hover]:[background:var(--surface)]"
                href={"/practice?grammar=" + item.grammarConcept.slug}
                key={item.id}
              >
                <div>
                  <strong className="learning-content" lang="en" dir="ltr">
                    {item.grammarConcept.title}
                  </strong>
                  <span>
                    {item.grammarConcept.introducedAt} ·{" "}
                    {t("progress.grammar.openMistakes", {
                      count: formatNumber(
                        locale,
                        mistakeCounts.get(item.grammarConceptId) ?? 0,
                      ),
                    })}
                  </span>
                </div>
                <ArrowRight className="rtl-mirror" size={16} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && transitions.length ? (
        <div className="grammar-progress-section [display:grid] [gap:10px] [&_h3]:[margin:0] [&_h3]:[font-size:0.86rem]">
          <h3>{t("progress.grammar.recentChanges")}</h3>
          <div className="weakness-list [display:flex] [flex-direction:column] [&_>_div]:[min-height:42px] [&_>_div]:[display:flex] [&_>_div]:[align-items:center] [&_>_div]:[justify-content:space-between] [&_>_div]:[gap:12px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_strong]:[color:var(--text-muted)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace]">
            {transitions.map((transition) => (
              <div key={transition.id}>
                <span className="learning-content" lang="en" dir="ltr">
                  {transition.grammarConcept.title}
                </span>
                <strong>
                  {transition.fromStatus
                    ? t(statusKeys[transition.fromStatus])
                    : t("progress.grammar.new")}{" "}
                  → {t(statusKeys[transition.toStatus])}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && recentEvidence.length ? (
        <div className="grammar-progress-section [display:grid] [gap:10px] [&_h3]:[margin:0] [&_h3]:[font-size:0.86rem]">
          <h3>{t("progress.grammar.recentEvidence")}</h3>
          <div className="weakness-list [display:flex] [flex-direction:column] [&_>_div]:[min-height:42px] [&_>_div]:[display:flex] [&_>_div]:[align-items:center] [&_>_div]:[justify-content:space-between] [&_>_div]:[gap:12px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_strong]:[color:var(--text-muted)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace]">
            {recentEvidence.slice(0, 5).map((evidence) => (
              <div key={evidence.id}>
                <span>
                  <span className="learning-content" lang="en" dir="ltr">
                    {evidence.grammarConcept.title}
                  </span>{" "}
                  ·{" "}
                  {evidenceSourceKeys[evidence.source]
                    ? t(evidenceSourceKeys[evidence.source])
                    : evidence.source.toLowerCase()}
                </span>
                <strong>
                  {outcomeKeys[evidence.outcome]
                    ? t(outcomeKeys[evidence.outcome])
                    : evidence.outcome.toLowerCase()}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Link href="/grammar" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
        {t("progress.grammar.openProfile")}{" "}
        <ArrowRight className="rtl-mirror" size={16} />
      </Link>
    </section>
  );
}
