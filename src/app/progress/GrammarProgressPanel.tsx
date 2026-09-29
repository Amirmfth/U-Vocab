import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { CefrLevel } from "@prisma/client";
import { db } from "@/lib/db";

const STATUS_LABELS = {
  STRONG: "Strong",
  LEARNING: "Learning",
  NEEDS_ATTENTION: "Needs attention",
  ASSUMED: "Assumed from level",
  UNASSESSED: "Not assessed",
} as const;

export async function GrammarProgressPanel({
  userId,
  userCourseId,
  currentLevel,
  targetLevel,
}: {
  userId: string;
  userCourseId: string;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
}) {
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
      where: { userId, accepted: true },
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
    .sort((a, b) => ["A1","A2","B1","B2","C1","C2"].indexOf(a) - ["A1","A2","B1","B2","C1","C2"].indexOf(b))
    .map((level) => ({
      label: level,
      summary: statusSummary(
        progress.filter((item) => item.grammarConcept.introducedAt === level),
      ),
      total: progress.filter((item) => item.grammarConcept.introducedAt === level).length,
    }));

  const byCategory = Array.from(
    new Set(progress.map((item) => item.grammarConcept.category)),
  )
    .map((category) => ({
      label: category.replaceAll("_", " ").toLowerCase(),
      summary: statusSummary(
        progress.filter((item) => item.grammarConcept.category === category),
      ),
      total: progress.filter((item) => item.grammarConcept.category === category).length,
    }))
    .sort(
      (a, b) =>
        (b.summary.get("NEEDS_ATTENTION") ?? 0) -
          (a.summary.get("NEEDS_ATTENTION") ?? 0) ||
        a.label.localeCompare(b.label),
    );

  const demonstrated = progress.filter(
    (item) => item.source === "EVIDENCE" && item.evidenceCount > 0,
  ).length;
  const assumed = progress.filter((item) => item.status === "ASSUMED").length;

  return (
    <section className="panel grammar-progress-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">GRAMMAR PROFILE</p>
          <h2>{currentLevel} → {targetLevel}</h2>
        </div>
        <GraduationCap size={20} />
      </div>

      <p className="analytics-caveat">
        Grammar is tracked as a finite skill profile. Assumed knowledge comes from
        your declared level; demonstrated knowledge comes from actual Practice,
        Writing, Reading, and other evidence.
      </p>

      <div className="grammar-progress-status-grid">
        {(["STRONG","LEARNING","NEEDS_ATTENTION","ASSUMED","UNASSESSED"] as const).map((status) => (
          <div key={status}>
            <strong>{counts.get(status) ?? 0}</strong>
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      <div className="grammar-progress-evidence">
        <span><strong>{demonstrated}</strong> demonstrated concepts</span>
        <span><strong>{assumed}</strong> assumed from declared level</span>
      </div>

      {byLevel.length ? (
        <div className="grammar-progress-section">
          <h3>By CEFR level</h3>
          <div className="grammar-profile-breakdown">
            {byLevel.map((group) => (
              <div key={group.label}>
                <strong>{group.label}</strong>
                <span>{group.total} concepts</span>
                <small>
                  {group.summary.get("STRONG") ?? 0} strong · {group.summary.get("LEARNING") ?? 0} learning · {group.summary.get("NEEDS_ATTENTION") ?? 0} needs attention
                </small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {byCategory.length ? (
        <div className="grammar-progress-section">
          <h3>By category</h3>
          <div className="grammar-profile-breakdown">
            {byCategory.map((group) => (
              <div key={group.label}>
                <strong>{group.label}</strong>
                <span>{group.total} concepts</span>
                <small>
                  {group.summary.get("STRONG") ?? 0} strong · {group.summary.get("LEARNING") ?? 0} learning · {group.summary.get("NEEDS_ATTENTION") ?? 0} needs attention
                </small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {weaknesses.length ? (
        <div className="grammar-progress-section">
          <h3>Needs attention</h3>
          <div className="collection-list">
            {weaknesses.map((item) => (
              <Link
                className="collection-row"
                href={"/practice?grammar=" + item.grammarConcept.slug}
                key={item.id}
              >
                <div>
                  <strong>{item.grammarConcept.title}</strong>
                  <span>
                    {item.grammarConcept.introducedAt} · {mistakeCounts.get(item.grammarConceptId) ?? 0} open mistake occurrences
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {transitions.length ? (
        <div className="grammar-progress-section">
          <h3>Recent profile changes</h3>
          <div className="weakness-list">
            {transitions.map((transition) => (
              <div key={transition.id}>
                <span>{transition.grammarConcept.title}</span>
                <strong>
                  {(transition.fromStatus ?? "new").toLowerCase().replaceAll("_", " ")} → {transition.toStatus.toLowerCase().replaceAll("_", " ")}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {recentEvidence.length ? (
        <div className="grammar-progress-section">
          <h3>Recent evidence</h3>
          <div className="weakness-list">
            {recentEvidence.slice(0, 5).map((evidence) => (
              <div key={evidence.id}>
                <span>
                  {evidence.grammarConcept.title} · {evidence.source.replaceAll("_", " ").toLowerCase()}
                </span>
                <strong>{evidence.outcome.toLowerCase()}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Link href="/grammar" className="button button-secondary">
        Open grammar profile <ArrowRight size={16} />
      </Link>
    </section>
  );
}
