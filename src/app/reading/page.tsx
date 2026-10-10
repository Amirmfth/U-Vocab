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
    <main className="page reading-hub generated-reading-hub flex flex-col reading-measure-68ch gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b in-reading-form:max-w-uv-e83c9a8a13 in-reading-form:gap-4 in-reading-form:p-4.5 in-reading-form:border-uv-border-strong in-reading-form:bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-70p in-reading-form-button:min-h-13 in-collection-list:border-1px-solid-border-3 in-collection-row:min-h-17 in-collection-row:px-1 uv-min620:in-reading-form:p-5.5 uv-min940:pt-3">
      <section className="page-header compact practice-workbench-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 max-width-content-reading pt-5 in-h1:text-uv-fe7a9e3765c">
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
        <h2 className="section-title margin-0-0-10px text-uv-f19feeb881c text-uv-text-soft letter-spacing-0p02em-2">{t("reading.recent")}</h2>
        {readings.length ? (
          <div className="collection-list flex flex-col">
            {readings.map((reading) => (
              <Link
                className="collection-row border-1px-solid-border min-h-16 grid grid-template-columns-minmax-0-1fr-auto items-center gap-3 padding-11px-2px in-strong-2:block in-span:block in-span:mt-0.75 in-span:text-uv-text-muted in-span:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
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
          <div className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
            <BookOpenText size={22} />
            <strong>{t("reading.none")}</strong>
          </div>
        )}
      </section>
    </main>
  );
}
