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
    <main className="page reading-hub generated-reading-hub [display:flex] [flex-direction:column] [--reading-measure:68ch] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [max-width:920px] [&_.reading-form]:[max-width:880px] [&_.reading-form]:[gap:16px] [&_.reading-form]:[padding:18px] [&_.reading-form]:[border-color:var(--border-strong)] [&_.reading-form]:[background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent_70%),_var(--surface)] [&_.reading-form_.button]:[min-height:52px] [&_.collection-list]:[border-top:1px_solid_var(--border)] [&_.collection-row]:[min-height:68px] [&_.collection-row]:[padding-inline:4px] min-[620px]:[&_.reading-form]:[padding:22px] min-[940px]:[padding-top:12px]">
      <section className="page-header compact practice-workbench-header [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [max-width:var(--content-reading)] [padding-top:20px] [&_h1]:[font-size:clamp(2.5rem,_12vw,_5rem)]">
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

      <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
        <h2 className="section-title [margin:0_0_10px] [font-size:1rem] [color:var(--text-soft)] [letter-spacing:-0.02em]">{t("reading.recent")}</h2>
        {readings.length ? (
          <div className="collection-list [display:flex] [flex-direction:column]">
            {readings.map((reading) => (
              <Link
                className="collection-row [border-bottom:1px_solid_var(--border)] [min-height:64px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [align-items:center] [gap:12px] [padding:11px_2px] [&_strong]:[display:block] [&_span]:[display:block] [&_span]:[margin-top:3px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.76rem] min-[940px]:[&:hover]:[background:var(--surface)]"
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
          <div className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
            <BookOpenText size={22} />
            <strong>{t("reading.none")}</strong>
          </div>
        )}
      </section>
    </main>
  );
}
