import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { ReadingForm } from "./ReadingForm";

export default async function ReadingPage() {
  await connection();
  const user = await getCurrentUser();
  const [readings, vocabulary, grammar] = await Promise.all([
    db.story.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            targets: true,
            grammarTargets: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.userVocabulary.findMany({
      where: { userId: user.id },
      include: { lexeme: true },
      orderBy: [
        { production: "asc" },
        { contextualUsage: "asc" },
        { addedAt: "desc" },
      ],
      take: 250,
    }),
    db.grammarConcept.findMany({
      where: { active: true, language: "de" },
      include: {
        userProgress: {
          where: { userId: user.id },
          take: 1,
        },
      },
      orderBy: { order: "asc" },
      take: 120,
    }),
  ]);

  return (
    <main className="page reading-hub generated-reading-hub">
      <section className="page-header compact practice-workbench-header">
        <h1>Personalized German reading</h1>
      </section>

      <ReadingForm
        currentLevel={user.currentLevel}
        targetLevel={user.targetLevel}
        targets={vocabulary.map((item) => ({
          lexemeId: item.lexemeId,
          label: formatLexemeLabel(item.lexeme),
          state: item.state,
        }))}
        grammarOptions={grammar
          .filter((concept) => {
            const status = concept.userProgress[0]?.status ?? "UNASSESSED";
            return status !== "STRONG";
          })
          .map((concept) => ({
            id: concept.id,
            title: concept.title,
            level: concept.introducedAt,
            status: concept.userProgress[0]?.status ?? "UNASSESSED",
          }))}
      />

      <section className="page-section">
        <h2 className="section-title">Recent readings</h2>
        {readings.length ? (
          <div className="collection-list">
            {readings.map((reading) => (
              <Link
                className="collection-row"
                href={"/reading/" + reading.id}
                key={reading.id}
                prefetch
              >
                <div>
                  <strong>{reading.title}</strong>
                  <span>
                    {reading.level} · {reading.length.toLowerCase()} ·{" "}
                    {reading._count.targets} target words
                    {reading._count.grammarTargets
                      ? " · " + reading._count.grammarTargets + " grammar notes"
                      : ""}
                    {reading.completedAt
                      ? " · " +
                        Math.round((reading.comprehensionScore ?? 0) * 100) +
                        "% comprehension"
                      : ""}
                  </span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <BookOpenText size={22} />
            <strong>No generated readings yet.</strong>
          </div>
        )}
      </section>
    </main>
  );
}
