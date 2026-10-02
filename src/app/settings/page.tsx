import { connection } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { getServerTranslator } from "@/i18n/server";
import { uiLocaleFromDb } from "@/i18n/config";
import { SettingsForm } from "./SettingsForm";
import { UiLocaleForm } from "./UiLocaleForm";
import { SignOutButton } from "./SignOutButton";
import { getEffectivePlan, getQuotaSummary } from "@/lib/entitlements/service";
import { PlanStatusCard } from "./PlanStatusCard";
import { ReviewReminderSettings } from "./ReviewReminderSettings";
import { db } from "@/lib/db";
import { minuteToTimeValue } from "@/lib/notifications/time";
import { publicVapidKey, webPushConfigured } from "@/lib/notifications/config";

export default async function SettingsPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const [plan, quotas, notificationPreference, activePushDevices] = await Promise.all([
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
  ]);
  const language = targetLanguageConfig(course.targetLanguage);
  const languageLabel =
    course.targetLanguage === "GERMAN" ? t("common.german") : language.label;

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">{t("settings.eyebrow")}</p>
        <h1>{t("settings.title")}</h1>
        <p className="page-description">
          {t("settings.activeCourse", {
            language: languageLabel,
            current: course.currentLevel,
            target: course.targetLevel,
          })}
        </p>
      </section>

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
      />

      <section className="panel account-links">
        <div>
          <strong>{t("settings.accountSession")}</strong>
          <span className="muted">{t("settings.accountSessionHelp")}</span>
        </div>
        <SignOutButton />
      </section>
    </main>
  );
}
