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
    <section id="subscription" className="panel plan-status-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-1rem rounded-exact-18px">
      <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("plan.eyebrow")}</p>
          <h2>{plan.plan === "PRO" ? t("plan.pro") : t("plan.free")}</h2>
        </div>
        <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{plan.plan}</span>
      </div>

      <p className="muted text-uv-text-muted">
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

      <div className="quota-grid grid grid-template-columns-repeat-2-minmax-0-1fr gap-0p75rem uv-max640:grid-template-columns-1fr">
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

      <div className="plan-actions flex flex-wrap gap-0p75rem items-center">
        <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="button" disabled>
          {plan.plan === "PRO" ? t("plan.manageComingSoon") : t("plan.upgradeComingSoon")}
        </button>
        <span className="muted text-uv-text-muted">{t("plan.billingPlaceholder")}</span>
      </div>
    </section>
  );
}
