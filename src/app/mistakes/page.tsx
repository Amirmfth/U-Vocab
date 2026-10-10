import { connection } from "next/server";
import Link from "next/link";
import { Brain, Layers3 } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { db } from "@/lib/db";
import { clusterOpenMistakes } from "@/lib/semantic/clusters";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import type { MessageKey, Translator } from "@/i18n/core";
import { MistakeResolveButton } from "./MistakeResolveButton";
import { MistakeRefreshButton } from "./MistakeRefreshButton";

const mistakeKeys: Record<string, MessageKey> = {
  ARTICLE: "mistake.type.article",
  CASE: "mistake.type.case",
  PREPOSITION: "mistake.type.preposition",
  REFLEXIVE: "mistake.type.reflexive",
  COLLOCATION: "mistake.type.collocation",
  ADJECTIVE_ENDING: "mistake.type.adjective_ending",
  VERB_POSITION: "mistake.type.verb_position",
  WORD_ORDER: "mistake.type.word_order",
  TENSE: "mistake.type.tense",
  CONJUGATION: "mistake.type.conjugation",
  PRONOUN: "mistake.type.pronoun",
  AGREEMENT: "mistake.type.agreement",
  RELATIVE_CLAUSE: "mistake.type.relative_clause",
  PASSIVE: "mistake.type.passive",
  SUBJUNCTIVE: "mistake.type.subjunctive",
  WORD_CHOICE: "mistake.type.word_choice",
  WORD_FORM: "mistake.type.word_form",
  SPELLING: "mistake.type.spelling",
  OTHER: "mistake.type.other",
};

function clusterTitle(t: Translator, types: string[], count: number) {
  const normalized = types
    .slice(0, 3)
    .map((type) =>
      mistakeKeys[type]
        ? t(mistakeKeys[type])
        : type.replaceAll("_", " ").toLowerCase(),
    )
    .join(" + ");
  return count > 1
    ? t("mistakes.pattern", { types: normalized })
    : normalized;
}

export default async function MistakesPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const [clusters, grammarMistakes] = await Promise.all([
    clusterOpenMistakes(user.id, course.id),
    db.mistake.findMany({
      where: {
        userId: user.id,
        userCourseId: course.id,
        resolvedAt: null,
        grammarConceptId: { not: null },
      },
      include: {
        grammarConcept: {
          select: { id: true, slug: true, title: true, introducedAt: true },
        },
      },
      orderBy: [{ occurrences: "desc" }, { lastOccurredAt: "desc" }],
      take: 100,
    }),
  ]);

  const grammarGroups = Array.from(
    grammarMistakes.reduce((map, mistake) => {
      if (!mistake.grammarConcept) return map;
      const current = map.get(mistake.grammarConcept.id) ?? {
        concept: mistake.grammarConcept,
        items: [] as typeof grammarMistakes,
        occurrences: 0,
        latest: mistake.lastOccurredAt,
      };
      current.items.push(mistake);
      current.occurrences += mistake.occurrences;
      if (mistake.lastOccurredAt > current.latest) {
        current.latest = mistake.lastOccurredAt;
      }
      map.set(mistake.grammarConcept.id, current);
      return map;
    }, new Map<string, {
      concept: NonNullable<(typeof grammarMistakes)[number]["grammarConcept"]>;
      items: typeof grammarMistakes;
      occurrences: number;
      latest: Date;
    }>()),
  )
    .map(([, value]) => value)
    .sort(
      (a, b) =>
        b.occurrences - a.occurrences ||
        b.latest.getTime() - a.latest.getTime(),
    );

  const total =
    clusters.reduce((sum, cluster) => sum + cluster.items.length, 0) +
    grammarMistakes.length;
  const patternCount = clusters.length + grammarGroups.length;

  return (
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <h1>{t("mistakes.title")}</h1>
        <p className="muted text-uv-text-muted">
          {t("mistakes.openSummary", {
            mistakes: formatNumber(locale, total),
            patterns: formatNumber(locale, patternCount),
          })}
        </p>
        <MistakeRefreshButton />
      </section>

      {grammarGroups.length ? (
        <section className="mistake-cluster-list flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("mistakes.grammarEyebrow")}</p>
              <h2>{t("mistakes.grammarTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>
          {grammarGroups.map((group) => (
            <article className="panel mistake-cluster border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-4 rounded-uv-r6d27d54c6c" key={group.concept.id}>
              <div className="mistake-cluster-head flex items-start justify-between gap-3.5 in-h2:margin-8px-0-0 in-h2:text-uv-f44eab8f17b in-h2:letter-spacing-0p025em in-h2:capitalize in-svg:text-uv-text-muted in-svg:flex-0-0-auto">
                <div>
                  <div className="word-meta flex flex-wrap gap-1.75 items-center">
                    <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{group.concept.introducedAt}</span>
                    <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
                      {t.plural(
                        {
                          one: "mistakes.occurrences.one",
                          other: "mistakes.occurrences.other",
                        },
                        group.occurrences,
                        { count: formatNumber(locale, group.occurrences) },
                      )}
                    </span>
                  </div>
                  <h2 className="learning-content" lang="en" dir="ltr">
                    {group.concept.title}
                  </h2>
                </div>
                <Layers3 size={20} />
              </div>

              <div className="mistake-pattern-items flex flex-col border-1px-solid-border-3">
                {group.items.slice(0, 4).map((mistake) => (
                  <div className="mistake-pattern-row flex flex-col gap-3 padding-14px-0 border-1px-solid-border uv-min620:grid uv-min620:grid-template-columns-minmax-0-1fr-auto uv-min620:items-center" key={mistake.id}>
                    <div className="mistake-copy in-h2:margin-7px-0 in-h2:text-uv-f4b3c2ac5f6 in-h2:letter-spacing-0p025em min-w-0 in-strong:block in-strong:mb-1.75 in-p-2:margin-5px-0 in-p-2:line-height-1p45">
                      {mistake.actual ? (
                        <p>
                          <span className="muted text-uv-text-muted">{t("mistakes.youWrote")}</span>{" "}
                          <span className="learning-content" lang="de" dir="ltr">
                            {mistake.actual}
                          </span>
                        </p>
                      ) : null}
                      {mistake.expected ? (
                        <p>
                          <span className="muted text-uv-text-muted">{t("mistakes.expected")}</span>{" "}
                          <span className="learning-content" lang="de" dir="ltr">
                            {mistake.expected}
                          </span>
                        </p>
                      ) : null}
                      {mistake.explanation ? (
                        <p className="muted learning-content text-uv-text-muted" dir="auto">
                          {mistake.explanation}
                        </p>
                      ) : null}
                      <small className="muted text-uv-text-muted">
                        {mistakeKeys[mistake.type]
                          ? t(mistakeKeys[mistake.type])
                          : mistake.type.replaceAll("_", " ").toLowerCase()}{" "}
                        · {formatNumber(locale, mistake.occurrences)}×
                      </small>
                    </div>
                    <MistakeResolveButton mistakeId={mistake.id} />
                  </div>
                ))}
              </div>

              <Link
                className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                href={"/practice?grammar=" + group.concept.slug}
              >
                <Brain size={17} />
                {t("mistakes.practiceConcept", {
                  concept: group.concept.title,
                })}
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      {clusters.length ? (
        <section className="mistake-cluster-list flex flex-col gap-3">
          {clusters.map((cluster) => {
            const primary = cluster.items[0];
            return (
              <article className="panel mistake-cluster border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-4 rounded-uv-r6d27d54c6c" key={cluster.key}>
                <div className="mistake-cluster-head flex items-start justify-between gap-3.5 in-h2:margin-8px-0-0 in-h2:text-uv-f44eab8f17b in-h2:letter-spacing-0p025em in-h2:capitalize in-svg:text-uv-text-muted in-svg:flex-0-0-auto">
                  <div>
                    <div className="word-meta flex flex-wrap gap-1.75 items-center">
                      <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
                        {cluster.items.length > 1
                          ? t("mistakes.semanticCluster")
                          : t("mistakes.singlePattern")}
                      </span>
                      <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
                        {t.plural(
                          {
                            one: "mistakes.occurrences.one",
                            other: "mistakes.occurrences.other",
                          },
                          cluster.occurrences,
                          { count: formatNumber(locale, cluster.occurrences) },
                        )}
                      </span>
                    </div>
                    <h2>
                      {clusterTitle(t, cluster.types, cluster.items.length)}
                    </h2>
                  </div>
                  <Layers3 size={20} />
                </div>

                <div className="mistake-pattern-items flex flex-col border-1px-solid-border-3">
                  {cluster.items.map((mistake) => (
                    <div className="mistake-pattern-row flex flex-col gap-3 padding-14px-0 border-1px-solid-border uv-min620:grid uv-min620:grid-template-columns-minmax-0-1fr-auto uv-min620:items-center" key={mistake.id}>
                      <div className="mistake-copy in-h2:margin-7px-0 in-h2:text-uv-f4b3c2ac5f6 in-h2:letter-spacing-0p025em min-w-0 in-strong:block in-strong:mb-1.75 in-p-2:margin-5px-0 in-p-2:line-height-1p45">
                        <strong
                          className="learning-content"
                          lang="de"
                          dir="ltr"
                        >
                          {mistake.lexeme?.lemma ?? t("mistakes.generalGerman")}
                        </strong>
                        {mistake.actual ? (
                          <p>
                            <span className="muted text-uv-text-muted">{t("mistakes.youWrote")}</span>{" "}
                            <span className="learning-content" lang="de" dir="ltr">
                              {mistake.actual}
                            </span>
                          </p>
                        ) : null}
                        {mistake.expected ? (
                          <p>
                            <span className="muted text-uv-text-muted">{t("mistakes.expected")}</span>{" "}
                            <span className="learning-content" lang="de" dir="ltr">
                              {mistake.expected}
                            </span>
                          </p>
                        ) : null}
                        {mistake.explanation ? (
                          <p className="muted learning-content text-uv-text-muted" dir="auto">
                            {mistake.explanation}
                          </p>
                        ) : null}
                        <small className="muted text-uv-text-muted">
                          {mistakeKeys[mistake.type]
                            ? t(mistakeKeys[mistake.type])
                            : mistake.type.replaceAll("_", " ").toLowerCase()}{" "}
                          · {formatNumber(locale, mistake.occurrences)}×
                        </small>
                      </div>

                      <MistakeResolveButton mistakeId={mistake.id} />
                    </div>
                  ))}
                </div>

                {primary.lexemeId ? (
                  <Link
                    className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                    href={"/practice?lexeme=" + primary.lexemeId}
                  >
                    <Brain size={17} />
                    {t("mistakes.practiceWeakness")}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {!clusters.length && !grammarGroups.length ? (
        <div className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <strong>{t("mistakes.none")}</strong>
        </div>
      ) : null}
    </main>
  );
}
