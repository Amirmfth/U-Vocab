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
    <section id="subscription" className="panel plan-status-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-19feeb881c rounded-uv-r6d27d54c6c">
      <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("plan.eyebrow")}</p>
          <h2>{plan.plan === "PRO" ? t("plan.pro") : t("plan.free")}</h2>
        </div>
        <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{plan.plan}</span>
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

      <div className="quota-grid grid uv-grid-template-columns-dd0b1a1848 uv-gap-823f1262bd uv-max640:uv-grid-template-columns-6a5c4d4d49">
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

      <div className="plan-actions flex flex-wrap uv-gap-823f1262bd items-center">
        <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="button" disabled>
          {plan.plan === "PRO" ? t("plan.manageComingSoon") : t("plan.upgradeComingSoon")}
        </button>
        <span className="muted text-uv-text-muted">{t("plan.billingPlaceholder")}</span>
      </div>
    </section>
  );
}
