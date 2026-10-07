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
    <section className="panel course-management [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:16px] [border-radius:18px]">
      <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("settings.coursesEyebrow")}</p>
          <h2>{t("settings.coursesTitle")}</h2>
        </div>
        <Languages size={20} />
      </div>
      <p className="muted [color:var(--text-muted)]">{t("settings.coursesHelp")}</p>

      <div className="course-management-list [display:grid] [gap:8px] [&_form]:[margin:0]">
        {courses.map((course) => {
          const language = targetLanguageConfig(course.targetLanguage);
          const active = course.id === activeCourseId;
          return (
            <form action={switchCourseAction} key={course.id}>
              <input type="hidden" name="courseId" value={course.id} />
              <button
                type="submit"
                className={"course-management-row [width:100%] [min-height:58px] [display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [padding:12px_14px] [border:1px_solid_var(--border)] [border-radius:12px] [background:var(--surface-soft)] [color:var(--text)] [text-align:start] [cursor:pointer] [&_>_span:first-child]:[display:grid] [&_>_span:first-child]:[gap:3px] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.72rem] [&_>_span:last-child]:[color:var(--text-muted)] [&_>_span:last-child]:[font-size:0.72rem] [&.is-active]:[border-color:var(--primary)] [&:disabled]:[cursor:default] [&:disabled]:[opacity:1] " + (active ? "is-active" : "")}
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
          <div className="course-create-list [display:flex] [flex-wrap:wrap] [align-items:center] [gap:10px]">
            {availableToCreate.map((language) => (
              <form action={createCourseAction} key={language}>
                <input type="hidden" name="targetLanguage" value={language} />
                <button type="submit" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
                  <Plus size={17} />
                  {t("settings.addCourse", {
                    language: languageLabel(t, language),
                  })}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="course-upgrade [display:flex] [flex-wrap:wrap] [align-items:center] [gap:10px]">
            <p className="muted [color:var(--text-muted)]">{t("settings.multiCoursePro")}</p>
            <UpgradeCta label={t("settings.multiCourseUpgrade")} />
          </div>
        )
      ) : null}
    </section>
  );
}
