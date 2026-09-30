"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { identifyAnalyticsUser, resetAnalyticsIdentity } from "@/lib/analytics/client";

export function ObservabilityIdentity({
  userId,
  courseId,
  plan,
  uiLocale,
  targetLanguage,
}: {
  userId: string;
  courseId: string | null;
  plan: "FREE" | "PRO";
  uiLocale: string;
  targetLanguage: string | null;
}) {
  useEffect(() => {
    Sentry.setUser({ id: userId });
    Sentry.setTag("plan", plan);
    Sentry.setTag("ui_locale", uiLocale);
    if (courseId) Sentry.setTag("course_id", courseId);
    if (targetLanguage) Sentry.setTag("target_language", targetLanguage);

    identifyAnalyticsUser(userId, {
      uiLocale,
      plan,
      ...(targetLanguage ? { targetLanguage } : {}),
    });

    return () => {
      Sentry.setUser(null);
    };
  }, [courseId, plan, targetLanguage, uiLocale, userId]);

  return null;
}

export function resetObservabilityIdentity() {
  Sentry.setUser(null);
  resetAnalyticsIdentity();
}
