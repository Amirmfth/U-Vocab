import type { User } from "@prisma/client";

export const ONBOARDING_VERSION = 1;
export const ONBOARDING_FIRST_ACTION = "/vocabulary/new";
export const ONBOARDING_STEP_COUNT = 7;

export function onboardingComplete(
  user: Pick<User, "onboardingCompletedAt" | "onboardingVersion">,
) {
  return Boolean(
    user.onboardingCompletedAt &&
      user.onboardingVersion >= ONBOARDING_VERSION,
  );
}

export function normalizedOnboardingStep(step: number) {
  if (!Number.isFinite(step)) return 1;
  return Math.min(ONBOARDING_STEP_COUNT, Math.max(1, Math.trunc(step)));
}
