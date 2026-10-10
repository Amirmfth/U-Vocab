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
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("settings.eyebrow")}</p>
        <h1>{t("settings.title")}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">
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

      <section className="panel account-links border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-div:flex in-div:flex-col in-div:gap-1.25 in-muted:text-uv-f74fc13de71 in-muted:line-height-1p5 uv-min620:flex-row uv-min620:items-center uv-min620:justify-between rounded-uv-r6d27d54c6c">
        <div>
          <strong>{t("settings.accountSession")}</strong>
          <span className="muted text-uv-text-muted">{t("settings.accountSessionHelp")}</span>
        </div>
        <SignOutButton />
      </section>
    </main>
  );
}
