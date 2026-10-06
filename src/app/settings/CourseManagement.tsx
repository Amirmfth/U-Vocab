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
    <section className="panel course-management">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("settings.coursesEyebrow")}</p>
          <h2>{t("settings.coursesTitle")}</h2>
        </div>
        <Languages size={20} />
      </div>
      <p className="muted">{t("settings.coursesHelp")}</p>

      <div className="course-management-list">
        {courses.map((course) => {
          const language = targetLanguageConfig(course.targetLanguage);
          const active = course.id === activeCourseId;
          return (
            <form action={switchCourseAction} key={course.id}>
              <input type="hidden" name="courseId" value={course.id} />
              <button
                type="submit"
                className={"course-management-row " + (active ? "is-active" : "")}
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
          <div className="course-create-list">
            {availableToCreate.map((language) => (
              <form action={createCourseAction} key={language}>
                <input type="hidden" name="targetLanguage" value={language} />
                <button type="submit" className="button button-secondary">
                  <Plus size={17} />
                  {t("settings.addCourse", {
                    language: languageLabel(t, language),
                  })}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="course-upgrade">
            <p className="muted">{t("settings.multiCoursePro")}</p>
            <UpgradeCta label={t("settings.multiCourseUpgrade")} />
          </div>
        )
      ) : null}
    </section>
  );
}
