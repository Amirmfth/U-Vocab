import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { ReadingForm } from "./ReadingForm";

const LENGTH_KEYS: Record<string, MessageKey> = {
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
    <main className="page reading-hub generated-reading-hub flex flex-col uv---reading-measure-51f5a1cba8 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b uv-v79f14f97ec:max-w-uv-e83c9a8a13 uv-v79f14f97ec:gap-4 uv-v79f14f97ec:p-4.5 uv-v79f14f97ec:border-uv-border-strong uv-v79f14f97ec:uv-background-21ade80306 uv-v21375cf224:min-h-13 uv-v1506e77c3f:uv-border-top-8d7f82f403 uv-vfb6c9a8dbe:min-h-17 uv-vfb6c9a8dbe:px-1 uv-min620:uv-v79f14f97ec:p-5.5 uv-min940:pt-3">
      <section className="page-header compact practice-workbench-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 uv-max-width-5a165b8e65 pt-5 uv-v3bccf64584:text-uv-fe7a9e3765c">
        <h1>{t("reading.title", { language: languageLabel })}</h1>
      </section>

      <ReadingForm
        currentLevel={course.currentLevel}
        targetLevel={course.targetLevel}
        targetLanguage={language.code}
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

      <section className="page-section flex flex-col gap-3">
        <h2 className="section-title uv-margin-83bba30fc1 text-uv-f19feeb881c text-uv-text-soft uv-letter-spacing-235f37bdea">{t("reading.recent")}</h2>
        {readings.length ? (
          <div className="collection-list flex flex-col">
            {readings.map((reading) => (
              <Link
                className="collection-row uv-border-bottom-8d7f82f403 min-h-16 grid uv-grid-template-columns-f06dd92ea5 items-center gap-3 uv-padding-c9f5e3c335 uv-veda02a0adb:block uv-v36c0309a03:block uv-v36c0309a03:mt-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
                href={"/reading/" + reading.id}
                key={reading.id}
                prefetch
              >
                <div>
                  <strong className="learning-content" lang={language.code} dir="ltr">
                    {reading.title}
                  </strong>
                  <span>
                    {reading.level} · {t(LENGTH_KEYS[reading.length] ?? "reading.length.medium")} ·{" "}
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
                          value: formatNumber(
                            locale,
                            Math.round((reading.comprehensionScore ?? 0) * 100),
                          ),
                        })
                      : ""}
                  </span>
                </div>
                <ArrowRight className="rtl-mirror" size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
            <BookOpenText size={22} />
            <strong>{t("reading.none")}</strong>
          </div>
        )}
      </section>
    </main>
  );
}
