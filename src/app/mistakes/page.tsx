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
    <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <h1>{t("mistakes.title")}</h1>
        <p className="muted [color:var(--text-muted)]">
          {t("mistakes.openSummary", {
            mistakes: formatNumber(locale, total),
            patterns: formatNumber(locale, patternCount),
          })}
        </p>
        <MistakeRefreshButton />
      </section>

      {grammarGroups.length ? (
        <section className="mistake-cluster-list [display:flex] [flex-direction:column] [gap:12px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("mistakes.grammarEyebrow")}</p>
              <h2>{t("mistakes.grammarTitle")}</h2>
            </div>
            <Brain size={20} />
          </div>
          {grammarGroups.map((group) => (
            <article className="panel mistake-cluster [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:16px] [border-radius:18px]" key={group.concept.id}>
              <div className="mistake-cluster-head [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:14px] [&_h2]:[margin:8px_0_0] [&_h2]:[font-size:1.08rem] [&_h2]:[letter-spacing:-0.025em] [&_h2]:[text-transform:capitalize] [&_>_svg]:[color:var(--text-muted)] [&_>_svg]:[flex:0_0_auto]">
                <div>
                  <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
                    <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{group.concept.introducedAt}</span>
                    <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
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

              <div className="mistake-pattern-items [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
                {group.items.slice(0, 4).map((mistake) => (
                  <div className="mistake-pattern-row [display:flex] [flex-direction:column] [gap:12px] [padding:14px_0] [border-bottom:1px_solid_var(--border)] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:minmax(0,_1fr)_auto] min-[620px]:[align-items:center]" key={mistake.id}>
                    <div className="mistake-copy [&_h2]:[margin:7px_0] [&_h2]:[font-size:1.12rem] [&_h2]:[letter-spacing:-0.025em] [min-width:0] [&_>_strong]:[display:block] [&_>_strong]:[margin-bottom:7px] [&_p]:[margin:5px_0] [&_p]:[line-height:1.45]">
                      {mistake.actual ? (
                        <p>
                          <span className="muted [color:var(--text-muted)]">{t("mistakes.youWrote")}</span>{" "}
                          <span className="learning-content" lang="de" dir="ltr">
                            {mistake.actual}
                          </span>
                        </p>
                      ) : null}
                      {mistake.expected ? (
                        <p>
                          <span className="muted [color:var(--text-muted)]">{t("mistakes.expected")}</span>{" "}
                          <span className="learning-content" lang="de" dir="ltr">
                            {mistake.expected}
                          </span>
                        </p>
                      ) : null}
                      {mistake.explanation ? (
                        <p className="muted learning-content [color:var(--text-muted)]" dir="auto">
                          {mistake.explanation}
                        </p>
                      ) : null}
                      <small className="muted [color:var(--text-muted)]">
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
                className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
        <section className="mistake-cluster-list [display:flex] [flex-direction:column] [gap:12px]">
          {clusters.map((cluster) => {
            const primary = cluster.items[0];
            return (
              <article className="panel mistake-cluster [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:16px] [border-radius:18px]" key={cluster.key}>
                <div className="mistake-cluster-head [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:14px] [&_h2]:[margin:8px_0_0] [&_h2]:[font-size:1.08rem] [&_h2]:[letter-spacing:-0.025em] [&_h2]:[text-transform:capitalize] [&_>_svg]:[color:var(--text-muted)] [&_>_svg]:[flex:0_0_auto]">
                  <div>
                    <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
                      <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
                        {cluster.items.length > 1
                          ? t("mistakes.semanticCluster")
                          : t("mistakes.singlePattern")}
                      </span>
                      <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
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

                <div className="mistake-pattern-items [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
                  {cluster.items.map((mistake) => (
                    <div className="mistake-pattern-row [display:flex] [flex-direction:column] [gap:12px] [padding:14px_0] [border-bottom:1px_solid_var(--border)] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:minmax(0,_1fr)_auto] min-[620px]:[align-items:center]" key={mistake.id}>
                      <div className="mistake-copy [&_h2]:[margin:7px_0] [&_h2]:[font-size:1.12rem] [&_h2]:[letter-spacing:-0.025em] [min-width:0] [&_>_strong]:[display:block] [&_>_strong]:[margin-bottom:7px] [&_p]:[margin:5px_0] [&_p]:[line-height:1.45]">
                        <strong
                          className="learning-content"
                          lang="de"
                          dir="ltr"
                        >
                          {mistake.lexeme?.lemma ?? t("mistakes.generalGerman")}
                        </strong>
                        {mistake.actual ? (
                          <p>
                            <span className="muted [color:var(--text-muted)]">{t("mistakes.youWrote")}</span>{" "}
                            <span className="learning-content" lang="de" dir="ltr">
                              {mistake.actual}
                            </span>
                          </p>
                        ) : null}
                        {mistake.expected ? (
                          <p>
                            <span className="muted [color:var(--text-muted)]">{t("mistakes.expected")}</span>{" "}
                            <span className="learning-content" lang="de" dir="ltr">
                              {mistake.expected}
                            </span>
                          </p>
                        ) : null}
                        {mistake.explanation ? (
                          <p className="muted learning-content [color:var(--text-muted)]" dir="auto">
                            {mistake.explanation}
                          </p>
                        ) : null}
                        <small className="muted [color:var(--text-muted)]">
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
                    className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
        <div className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <strong>{t("mistakes.none")}</strong>
        </div>
      ) : null}
    </main>
  );
}
