import { connection } from "next/server";
import Link from "next/link";
import { Brain, Layers3 } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { db } from "@/lib/db";
import { clusterOpenMistakes } from "@/lib/semantic/clusters";
import { MistakeResolveButton } from "./MistakeResolveButton";
import { MistakeRefreshButton } from "./MistakeRefreshButton";


function clusterTitle(types: string[], count: number) {
  const normalized = types
    .slice(0, 3)
    .map((type) => type.replaceAll("_", " ").toLowerCase())
    .join(" + ");
  return count > 1 ? normalized + " pattern" : normalized;
}

export default async function MistakesPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
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
      if (mistake.lastOccurredAt > current.latest) current.latest = mistake.lastOccurredAt;
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
    .sort((a, b) => b.occurrences - a.occurrences || b.latest.getTime() - a.latest.getTime());

  const total =
    clusters.reduce((sum, cluster) => sum + cluster.items.length, 0) +
    grammarMistakes.length;

  return (
    <main className="page">
      <section className="page-header compact">
        <h1>Recurring weaknesses</h1>
        <p className="muted">{total} open mistakes · {clusters.length + grammarGroups.length} patterns</p>
        <MistakeRefreshButton />
      </section>

      {grammarGroups.length ? (
        <section className="mistake-cluster-list">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GRAMMAR WEAKNESSES</p>
              <h2>Concepts to reinforce</h2>
            </div>
            <Brain size={20} />
          </div>
          {grammarGroups.map((group) => (
            <article className="panel mistake-cluster" key={group.concept.id}>
              <div className="mistake-cluster-head">
                <div>
                  <div className="word-meta">
                    <span className="badge">{group.concept.introducedAt}</span>
                    <span className="badge">{group.occurrences} occurrences</span>
                  </div>
                  <h2>{group.concept.title}</h2>
                </div>
                <Layers3 size={20} />
              </div>

              <div className="mistake-pattern-items">
                {group.items.slice(0, 4).map((mistake) => (
                  <div className="mistake-pattern-row" key={mistake.id}>
                    <div className="mistake-copy">
                      {mistake.actual ? <p><span className="muted">You wrote:</span> {mistake.actual}</p> : null}
                      {mistake.expected ? <p><span className="muted">Expected:</span> {mistake.expected}</p> : null}
                      {mistake.explanation ? <p className="muted">{mistake.explanation}</p> : null}
                      <small className="muted">
                        {mistake.type.replaceAll("_", " ").toLowerCase()} · {mistake.occurrences}×
                      </small>
                    </div>
                    <MistakeResolveButton mistakeId={mistake.id} />
                  </div>
                ))}
              </div>

              <Link className="button button-primary" href={"/practice?grammar=" + group.concept.slug}>
                <Brain size={17} />
                Practice {group.concept.title}
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
                        {cluster.items.length > 1 ? "semantic cluster" : "single pattern"}
                      </span>
                      <span className="badge">{cluster.occurrences} occurrences</span>
                    </div>
                    <h2>{clusterTitle(cluster.types, cluster.items.length)}</h2>
                  </div>
                  <Layers3 size={20} />
                </div>

                <div className="mistake-pattern-items">
                  {cluster.items.map((mistake) => (
                    <div className="mistake-pattern-row" key={mistake.id}>
                      <div className="mistake-copy">
                        <strong>{mistake.lexeme?.lemma ?? "General German"}</strong>
                        {mistake.actual ? (
                          <p><span className="muted">You wrote:</span> {mistake.actual}</p>
                        ) : null}
                        {mistake.expected ? (
                          <p><span className="muted">Expected:</span> {mistake.expected}</p>
                        ) : null}
                        {mistake.explanation ? (
                          <p className="muted">{mistake.explanation}</p>
                        ) : null}
                        <small className="muted">
                          {mistake.type.replaceAll("_", " ").toLowerCase()} · {mistake.occurrences}×
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
                    Practice this weakness
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {!clusters.length && !grammarGroups.length ? (
        <div className="empty-state compact-empty">
          <strong>No open mistake patterns.</strong>
        </div>
      ) : null}
    </main>
  );
}
