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
    <main className="page">
      <section className="page-header compact">
        <h1>{t("mistakes.title")}</h1>
        <p className="muted">
          {t("mistakes.openSummary", {
            mistakes: formatNumber(locale, total),
            patterns: formatNumber(locale, patternCount),
          })}
        </p>
        <MistakeRefreshButton />
      </section>

      {grammarGroups.length ? (
        <section className="mistake-cluster-list">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("mistakes.grammarEyebrow")}</p>
              <h2>{t("mistakes.grammarTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>
          {grammarGroups.map((group) => (
            <article className="panel mistake-cluster" key={group.concept.id}>
              <div className="mistake-cluster-head">
                <div>
                  <div className="word-meta">
                    <span className="badge">{group.concept.introducedAt}</span>
                    <span className="badge">
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

              <div className="mistake-pattern-items">
                {group.items.slice(0, 4).map((mistake) => (
                  <div className="mistake-pattern-row" key={mistake.id}>
                    <div className="mistake-copy">
                      {mistake.actual ? (
                        <p>
                          <span className="muted">{t("mistakes.youWrote")}</span>{" "}
                          <span className="learning-content" lang="de" dir="ltr">
                            {mistake.actual}
                          </span>
                        </p>
                      ) : null}
                      {mistake.expected ? (
                        <p>
                          <span className="muted">{t("mistakes.expected")}</span>{" "}
                          <span className="learning-content" lang="de" dir="ltr">
                            {mistake.expected}
                          </span>
                        </p>
                      ) : null}
                      {mistake.explanation ? (
                        <p className="muted learning-content" dir="auto">
                          {mistake.explanation}
                        </p>
                      ) : null}
                      <small className="muted">
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
                className="button button-primary"
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
        <section className="mistake-cluster-list">
          {clusters.map((cluster) => {
            const primary = cluster.items[0];
            return (
              <article className="panel mistake-cluster" key={cluster.key}>
                <div className="mistake-cluster-head">
                  <div>
                    <div className="word-meta">
                      <span className="badge">
                        {cluster.items.length > 1
                          ? t("mistakes.semanticCluster")
                          : t("mistakes.singlePattern")}
                      </span>
                      <span className="badge">
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

                <div className="mistake-pattern-items">
                  {cluster.items.map((mistake) => (
                    <div className="mistake-pattern-row" key={mistake.id}>
                      <div className="mistake-copy">
                        <strong
                          className="learning-content"
                          lang="de"
                          dir="ltr"
                        >
                          {mistake.lexeme?.lemma ?? t("mistakes.generalGerman")}
                        </strong>
                        {mistake.actual ? (
                          <p>
                            <span className="muted">{t("mistakes.youWrote")}</span>{" "}
                            <span className="learning-content" lang="de" dir="ltr">
                              {mistake.actual}
                            </span>
                          </p>
                        ) : null}
                        {mistake.expected ? (
                          <p>
                            <span className="muted">{t("mistakes.expected")}</span>{" "}
                            <span className="learning-content" lang="de" dir="ltr">
                              {mistake.expected}
                            </span>
                          </p>
                        ) : null}
                        {mistake.explanation ? (
                          <p className="muted learning-content" dir="auto">
                            {mistake.explanation}
                          </p>
                        ) : null}
                        <small className="muted">
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
                    className="button button-primary"
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
        <div className="empty-state compact-empty">
          <strong>{t("mistakes.none")}</strong>
        </div>
      ) : null}
    </main>
  );
}
