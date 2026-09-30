import type { EffectivePlan } from "@/lib/entitlements/service";
import type { QuotaKey } from "@/lib/entitlements/config";
import { QuotaRemaining } from "@/components/entitlement-primitives";
import type { Translator } from "@/i18n/core";
import { formatDate, formatNumber } from "@/i18n/format";
import type { UiLocale } from "@/i18n/config";

const quotaOrder: QuotaKey[] = [
  "vocabulary_addition_daily",
  "conversation_turn_monthly",
  "writing_evaluation_monthly",
  "reading_generation_monthly",
];

export function PlanStatusCard({
  plan,
  quotas,
  locale,
  t,
}: {
  plan: EffectivePlan;
  quotas: Array<{
    key: QuotaKey;
    limit: number;
    used: number;
    remaining: number;
    resetAt: Date;
  }>;
  locale: UiLocale;
  t: Translator;
}) {
  const byKey = new Map(quotas.map((quota) => [quota.key, quota]));
  const labels: Record<QuotaKey, string> = {
    vocabulary_addition_daily: t("plan.quota.vocabulary"),
    conversation_turn_monthly: t("plan.quota.conversation"),
    writing_evaluation_monthly: t("plan.quota.writing"),
    reading_generation_monthly: t("plan.quota.reading"),
    voice_transcription_minutes_monthly: t("plan.quota.voice"),
  };

  return (
    <section id="subscription" className="panel plan-status-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("plan.eyebrow")}</p>
          <h2>{plan.plan === "PRO" ? t("plan.pro") : t("plan.free")}</h2>
        </div>
        <span className="badge">{plan.plan}</span>
      </div>

      <p className="muted">
        {plan.source === "subscription"
          ? plan.cancelAtPeriodEnd
            ? t("plan.endsOn", {
                date: plan.validUntil
                  ? formatDate(locale, plan.validUntil, { dateStyle: "medium" })
                  : "",
              })
            : t("plan.renewsOn", {
                date: plan.validUntil
                  ? formatDate(locale, plan.validUntil, { dateStyle: "medium" })
                  : "",
              })
          : plan.source === "grant"
            ? plan.validUntil
              ? t("plan.grantUntil", {
                  date: formatDate(locale, plan.validUntil, { dateStyle: "medium" }),
                })
              : t("plan.manualGrant")
            : t("plan.freeHelp")}
      </p>

      <div className="quota-grid">
        {quotaOrder.map((key) => {
          const quota = byKey.get(key);
          if (!quota) return null;
          return (
            <QuotaRemaining
              key={key}
              label={labels[key]}
              used={Number(formatNumber(locale, quota.used).replace(/\D/g, "")) || quota.used}
              limit={quota.limit}
              remaining={quota.remaining}
            />
          );
        })}
      </div>

      <div className="plan-actions">
        <button className="button button-primary" type="button" disabled>
          {plan.plan === "PRO" ? t("plan.manageComingSoon") : t("plan.upgradeComingSoon")}
        </button>
        <span className="muted">{t("plan.billingPlaceholder")}</span>
      </div>
    </section>
  );
}
