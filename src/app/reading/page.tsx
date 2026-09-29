import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber, formatPercent } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { ReadingForm } from "./ReadingForm";

const lengthKeys: Record<string, MessageKey> = {
  SHORT: "reading.length.short",
  MEDIUM: "reading.length.medium",
  LONG: "reading.length.long",
};

export default async function ReadingPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const language = targetLanguageConfig(course.targetLanguage);
  const languageLabel =
    course.targetLanguage === "GERMAN" ? t("common.german") : language.label;
  const [readings, vocabulary, grammar] = await Promise.all([
    db.story.findMany({
      where: { userCourseId: course.id },
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
      where: { active: true, language: language.code },
      include: {
        userProgress: {
          where: { userCourseId: course.id },
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
        <h1>{t("reading.title", { language: languageLabel })}</h1>
      </section>

      <ReadingForm
        currentLevel={course.currentLevel}
        targetLevel={course.targetLevel}
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
        <h2 className="section-title">{t("reading.recent")}</h2>
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
                  <strong className="learning-content" lang={language.code} dir="ltr">
                    {reading.title}
                  </strong>
                  <span>
                    {reading.level} ·{" "}
                    {t(lengthKeys[reading.length] ?? "reading.length.medium")} ·{" "}
                    {t("reading.targetWords", {
                      count: formatNumber(locale, reading._count.targets),
                    })}
                    {reading._count.grammarTargets
                      ? " · " +
                        t("reading.grammarNotes", {
                          count: formatNumber(locale, reading._count.grammarTargets),
                        })
                      : ""}
                    {reading.completedAt
                      ? " · " +
                        t("reading.comprehension", {
                          value: formatPercent(
                            locale,
                            reading.comprehensionScore ?? 0,
                          ).replace("%", "").replace("٪", ""),
                        })
                      : ""}
                  </span>
                </div>
                <ArrowRight className="rtl-mirror" size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <BookOpenText size={22} />
            <strong>{t("reading.none")}</strong>
          </div>
        )}
      </section>
    </main>
  );
}
