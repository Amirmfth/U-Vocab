import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { ENABLED_TARGET_LANGUAGES } from "@/lib/languages";
import { onboardingComplete, normalizedOnboardingStep } from "@/lib/onboarding";
import { uiLocaleFromDb } from "@/i18n/config";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (onboardingComplete(user)) redirect("/vocabulary");

  const course = await getCurrentCourse();

  return (
    <OnboardingWizard
      initialStep={normalizedOnboardingStep(user.onboardingStep)}
      initialLocale={uiLocaleFromDb(user.uiLocale)}
      targetLanguage={course.targetLanguage}
      currentLevel={course.currentLevel}
      targetLevel={course.targetLevel}
      explanationLanguage={course.explanationLanguage}
      enabledLanguages={[...ENABLED_TARGET_LANGUAGES]}
    />
  );
}
