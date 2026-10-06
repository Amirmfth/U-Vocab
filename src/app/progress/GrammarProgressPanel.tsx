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
    <section className="panel grammar-progress-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("progress.grammar.eyebrow")}</p>
          <h2>
            {currentLevel} → {targetLevel}
          </h2>
        </div>
        <GraduationCap size={20} />
      </div>

      <p className="analytics-caveat">{t("progress.grammar.description")}</p>

      <div className="grammar-progress-status-grid">
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

      <div className="grammar-progress-evidence">
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
        <div className="grammar-progress-section">
          <h3>{t("progress.grammar.byLevel")}</h3>
          <div className="grammar-profile-breakdown">
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
        <div className="grammar-progress-section">
          <h3>{t("progress.grammar.byCategory")}</h3>
          <div className="grammar-profile-breakdown">
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
        <div className="grammar-progress-section">
          <h3>{t("progress.grammar.needsAttention")}</h3>
          <div className="collection-list">
            {weaknesses.map((item) => (
              <Link
                className="collection-row"
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
        <div className="grammar-progress-section">
          <h3>{t("progress.grammar.recentChanges")}</h3>
          <div className="weakness-list">
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
        <div className="grammar-progress-section">
          <h3>{t("progress.grammar.recentEvidence")}</h3>
          <div className="weakness-list">
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

      <Link href="/grammar" className="button button-secondary">
        {t("progress.grammar.openProfile")}{" "}
        <ArrowRight className="rtl-mirror" size={16} />
      </Link>
    </section>
  );
}
