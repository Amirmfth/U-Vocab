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
    <section id="subscription" className="panel plan-status-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:1rem] [border-radius:18px]">
      <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("plan.eyebrow")}</p>
          <h2>{plan.plan === "PRO" ? t("plan.pro") : t("plan.free")}</h2>
        </div>
        <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{plan.plan}</span>
      </div>

      <p className="muted [color:var(--text-muted)]">
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

      <div className="quota-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:0.75rem] max-[640px]:[grid-template-columns:1fr]">
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

      <div className="plan-actions [display:flex] [flex-wrap:wrap] [gap:0.75rem] [align-items:center]">
        <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="button" disabled>
          {plan.plan === "PRO" ? t("plan.manageComingSoon") : t("plan.upgradeComingSoon")}
        </button>
        <span className="muted [color:var(--text-muted)]">{t("plan.billingPlaceholder")}</span>
      </div>
    </section>
  );
}
