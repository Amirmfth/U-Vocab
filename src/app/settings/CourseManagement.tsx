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
    <section className="panel course-management uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid gap-4 rounded-uv-r6d27d54c6c">
      <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("settings.coursesEyebrow")}</p>
          <h2>{t("settings.coursesTitle")}</h2>
        </div>
        <Languages size={20} />
      </div>
      <p className="muted text-uv-text-muted">{t("settings.coursesHelp")}</p>

      <div className="course-management-list grid gap-2 uv-v8cd0743a41:m-0">
        {courses.map((course) => {
          const language = targetLanguageConfig(course.targetLanguage);
          const active = course.id === activeCourseId;
          return (
            <form action={switchCourseAction} key={course.id}>
              <input type="hidden" name="courseId" value={course.id} />
              <button
                type="submit"
                className={"course-management-row w-full min-h-14.5 flex items-center justify-between gap-4 uv-padding-277e98e510 uv-border-8d7f82f403 rounded-uv-r0939007802 bg-uv-surface-soft text-uv-text text-start cursor-pointer uv-v386ffa8f69:grid uv-v386ffa8f69:gap-0.75 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff1713651e0 uv-vfedd56ae40:text-uv-text-muted uv-vfedd56ae40:text-uv-ff1713651e0 uv-v14ef0811e9:border-uv-primary disabled:cursor-default disabled:opacity-100 " + (active ? "is-active" : "")}
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
                <button type="submit" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
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
