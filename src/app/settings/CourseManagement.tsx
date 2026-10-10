import type { TargetLanguage, UserCourse } from "@prisma/client";
import { Check, Languages, Plus } from "lucide-react";
import type { Translator } from "@/i18n/core";
import { targetLanguageConfig } from "@/lib/languages";
import { UpgradeCta } from "@/components/entitlement-primitives";
import { createCourseAction, switchCourseAction } from "./course-actions";

function languageLabel(t: Translator, language: TargetLanguage) {
  if (language === "GERMAN") return t("common.german");
  if (language === "FRENCH") return t("common.french");
  return targetLanguageConfig(language).label;
}

export function CourseManagement({
  courses,
  activeCourseId,
  enabledLanguages,
  canCreateAdditionalCourse,
  t,
}: {
  courses: UserCourse[];
  activeCourseId: string;
  enabledLanguages: TargetLanguage[];
  canCreateAdditionalCourse: boolean;
  t: Translator;
}) {
  const existingLanguages = new Set(courses.map((course) => course.targetLanguage));
  const availableToCreate = enabledLanguages.filter(
    (language) => !existingLanguages.has(language),
  );

  return (
    <section className="panel course-management border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-4 rounded-exact-18px">
      <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("settings.coursesEyebrow")}</p>
          <h2>{t("settings.coursesTitle")}</h2>
        </div>
        <Languages size={20} />
      </div>
      <p className="muted text-uv-text-muted">{t("settings.coursesHelp")}</p>

      <div className="course-management-list grid gap-2 in-form:m-0">
        {courses.map((course) => {
          const language = targetLanguageConfig(course.targetLanguage);
          const active = course.id === activeCourseId;
          return (
            <form action={switchCourseAction} key={course.id}>
              <input type="hidden" name="courseId" value={course.id} />
              <button
                type="submit"
                className={"course-management-row w-full min-h-14.5 flex items-center justify-between gap-4 padding-12px-14px border-1px-solid-border-2 rounded-exact-12px bg-uv-surface-soft text-uv-text text-start cursor-pointer in-span-first-child:grid in-span-first-child:gap-0.75 in-small:text-uv-text-muted in-small:text-exact-0p72rem in-span-last-child:text-uv-text-muted in-span-last-child:text-exact-0p72rem in-is-active:border-uv-primary disabled:cursor-default disabled:opacity-100 " + (active ? "is-active" : "")}
                disabled={active || !language.enabled}
                aria-current={active ? "true" : undefined}
              >
                <span>
                  <strong>{languageLabel(t, course.targetLanguage)}</strong>
                  <small>
                    {course.currentLevel} → {course.targetLevel} · {language.nativeLabel}
                  </small>
                </span>
                {active ? <Check size={18} /> : <span>{t("settings.switchCourse")}</span>}
              </button>
            </form>
          );
        })}
      </div>

      {availableToCreate.length ? (
        canCreateAdditionalCourse || courses.length === 0 ? (
          <div className="course-create-list flex flex-wrap items-center gap-2.5">
            {availableToCreate.map((language) => (
              <form action={createCourseAction} key={language}>
                <input type="hidden" name="targetLanguage" value={language} />
                <button type="submit" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
                  <Plus size={17} />
                  {t("settings.addCourse", {
                    language: languageLabel(t, language),
                  })}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="course-upgrade flex flex-wrap items-center gap-2.5">
            <p className="muted text-uv-text-muted">{t("settings.multiCoursePro")}</p>
            <UpgradeCta label={t("settings.multiCourseUpgrade")} />
          </div>
        )
      ) : null}
    </section>
  );
}
