import { connection } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { ENABLED_TARGET_LANGUAGES, targetLanguageConfig } from "@/lib/languages";
import { getServerTranslator } from "@/i18n/server";
import { uiLocaleFromDb } from "@/i18n/config";
import { SettingsForm } from "./SettingsForm";
import { UiLocaleForm } from "./UiLocaleForm";
import { SignOutButton } from "./SignOutButton";
import { getEffectivePlan, getQuotaSummary } from "@/lib/entitlements/service";
import { PlanStatusCard } from "./PlanStatusCard";
import { ReviewReminderSettings } from "./ReviewReminderSettings";
import { CourseManagement } from "./CourseManagement";
import { db } from "@/lib/db";
import { minuteToTimeValue } from "@/lib/notifications/time";
import { publicVapidKey, webPushConfigured } from "@/lib/notifications/config";

export default async function SettingsPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const [plan, quotas, notificationPreference, activePushDevices, courses] = await Promise.all([
    getEffectivePlan(user.id),
    getQuotaSummary({
      userId: user.id,
      userCourseId: course.id,
      timeZone: user.timezone,
    }),
    db.reviewNotificationPreference.findUnique({
      where: { userCourseId: course.id },
    }),
    db.webPushSubscription.count({
      where: { userId: user.id, status: "ACTIVE" },
    }),
    db.userCourse.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const language = targetLanguageConfig(course.targetLanguage);
  const languageLabel =
    course.targetLanguage === "GERMAN"
      ? t("common.german")
      : course.targetLanguage === "FRENCH"
        ? t("common.french")
        : language.label;

  return (
    <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("settings.eyebrow")}</p>
        <h1>{t("settings.title")}</h1>
        <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">
          {t("settings.activeCourse", {
            language: languageLabel,
            current: course.currentLevel,
            target: course.targetLevel,
          })}
        </p>
      </section>

      <CourseManagement
        courses={courses}
        activeCourseId={course.id}
        enabledLanguages={[...ENABLED_TARGET_LANGUAGES]}
        canCreateAdditionalCourse={plan.plan === "PRO"}
        t={t}
      />

      <PlanStatusCard plan={plan} quotas={quotas} locale={locale} t={t} />

      <ReviewReminderSettings
        configured={webPushConfigured()}
        publicKey={publicVapidKey()}
        initialEnabled={notificationPreference?.enabled ?? false}
        initialReminderTime={minuteToTimeValue(notificationPreference?.reminderMinuteOfDay ?? 1080)}
        initialMinimumDueCount={notificationPreference?.minimumDueCount ?? 1}
        initialTimeZone={user.timezone || "UTC"}
        activeDeviceCount={activePushDevices}
      />

      <UiLocaleForm locale={uiLocaleFromDb(user.uiLocale)} />

      <SettingsForm
        preference={course.explanationLanguage}
        currentLevel={course.currentLevel}
        targetLevel={course.targetLevel}
        languageLabel={languageLabel}
      />

      <section className="panel account-links [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:5px] [&_.muted]:[font-size:0.76rem] [&_.muted]:[line-height:1.5] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center] min-[620px]:[justify-content:space-between] [border-radius:18px]">
        <div>
          <strong>{t("settings.accountSession")}</strong>
          <span className="muted [color:var(--text-muted)]">{t("settings.accountSessionHelp")}</span>
        </div>
        <SignOutButton />
      </section>
    </main>
  );
}
