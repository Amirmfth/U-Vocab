import { connection } from "next/server";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
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

export default async function SettingsPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const [plan, quotas] = await Promise.all([
    getEffectivePlan(user.id),
    getQuotaSummary({
      userId: user.id,
      userCourseId: course.id,
      timeZone: user.timezone,
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

      <UiLocaleForm locale={uiLocaleFromDb(user.uiLocale)} />

      <SettingsForm
        preference={course.explanationLanguage}
        currentLevel={course.currentLevel}
        targetLevel={course.targetLevel}
      />

      <section className="panel account-links">
        <div>
          <strong>{t("settings.aiOperations")}</strong>
          <span className="muted">{t("settings.aiOperationsHelp")}</span>
        </div>
        <Link href="/usage" className="button button-secondary">
          <BarChart3 size={17} /> {t("nav.aiUsage")}
        </Link>
      </section>

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
