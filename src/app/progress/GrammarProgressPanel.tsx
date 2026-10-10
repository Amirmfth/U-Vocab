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
    <section className="panel grammar-progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid gap-4.5 mb-5.5 rounded-uv-r6d27d54c6c">
      <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.grammar.eyebrow")}</p>
          <h2>
            {currentLevel} → {targetLevel}
          </h2>
        </div>
        <GraduationCap size={20} />
      </div>

      <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">{t("progress.grammar.description")}</p>

      <div className="grammar-progress-status-grid grid uv-grid-template-columns-dd0b1a1848 gap-2 uv-vcbb57f4d35:grid uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:p-3 uv-vcbb57f4d35:uv-border-8d7f82f403 uv-vcbb57f4d35:rounded-uv-r0939007802 uv-veda02a0adb:text-uv-fffcebd47f5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff1713651e0 uv-min620:uv-grid-template-columns-259802fd7a">
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

      <div className="grammar-progress-evidence text-uv-text-muted text-uv-ff1713651e0 flex flex-wrap gap-3">
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
        <div className="grammar-progress-section grid gap-2.5 uv-v55c53ce4b9:m-0 uv-v55c53ce4b9:text-uv-f9601fe81a7">
          <h3>{t("progress.grammar.byLevel")}</h3>
          <div className="grammar-profile-breakdown grid gap-2 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-f06dd92ea5 uv-vcbb57f4d35:uv-gap-be0270db3f uv-vcbb57f4d35:uv-padding-10ff753f5f uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-veda02a0adb:capitalize uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f58b84cc6f5 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-f58b84cc6f5 uv-v982220ddd5:uv-grid-column-93b665dfb5">
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
        <div className="grammar-progress-section grid gap-2.5 uv-v55c53ce4b9:m-0 uv-v55c53ce4b9:text-uv-f9601fe81a7">
          <h3>{t("progress.grammar.byCategory")}</h3>
          <div className="grammar-profile-breakdown grid gap-2 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-f06dd92ea5 uv-vcbb57f4d35:uv-gap-be0270db3f uv-vcbb57f4d35:uv-padding-10ff753f5f uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-veda02a0adb:capitalize uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f58b84cc6f5 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-f58b84cc6f5 uv-v982220ddd5:uv-grid-column-93b665dfb5">
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
        <div className="grammar-progress-section grid gap-2.5 uv-v55c53ce4b9:m-0 uv-v55c53ce4b9:text-uv-f9601fe81a7">
          <h3>{t("progress.grammar.needsAttention")}</h3>
          <div className="collection-list flex flex-col">
            {weaknesses.map((item) => (
              <Link
                className="collection-row uv-border-bottom-8d7f82f403 min-h-16 grid uv-grid-template-columns-f06dd92ea5 items-center gap-3 uv-padding-c9f5e3c335 uv-veda02a0adb:block uv-v36c0309a03:block uv-v36c0309a03:mt-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
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
        <div className="grammar-progress-section grid gap-2.5 uv-v55c53ce4b9:m-0 uv-v55c53ce4b9:text-uv-f9601fe81a7">
          <h3>{t("progress.grammar.recentChanges")}</h3>
          <div className="weakness-list flex flex-col uv-vcbb57f4d35:min-h-10.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:items-center uv-vcbb57f4d35:justify-between uv-vcbb57f4d35:gap-3 uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-vaff5733806:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-veda02a0adb:text-uv-text-muted uv-veda02a0adb:uv-font-family-320794573f">
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
        <div className="grammar-progress-section grid gap-2.5 uv-v55c53ce4b9:m-0 uv-v55c53ce4b9:text-uv-f9601fe81a7">
          <h3>{t("progress.grammar.recentEvidence")}</h3>
          <div className="weakness-list flex flex-col uv-vcbb57f4d35:min-h-10.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:items-center uv-vcbb57f4d35:justify-between uv-vcbb57f4d35:gap-3 uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-vaff5733806:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-veda02a0adb:text-uv-text-muted uv-veda02a0adb:uv-font-family-320794573f">
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

      <Link href="/grammar" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
        {t("progress.grammar.openProfile")}{" "}
        <ArrowRight className="rtl-mirror" size={16} />
      </Link>
    </section>
  );
}
