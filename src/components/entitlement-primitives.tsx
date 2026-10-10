import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";

export function QuotaRemaining({
  label,
  used,
  limit,
  remaining,
}: {
  label: string;
  used: number | string;
  limit: number | string;
  remaining: number | string;
}) {
  return (
    <div className="quota-remaining grid gap-0p2rem padding-0p9rem border-1px-solid-border-2 rounded-exact-14px bg-uv-surface in-span-2:text-uv-c7dbd63a13e in-small-2:text-uv-c7dbd63a13e in-strong:text-exact-1p5rem in-strong:font-tabular-nums">
      <span>{label}</span>
      <strong>{remaining}</strong>
      <small>{used} / {limit}</small>
    </div>
  );
}

export function UpgradeCta({ label }: { label: string }) {
  return (
    <Link href="/settings#subscription" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
      <Sparkles size={17} />
      {label}
    </Link>
  );
}

export function LockedFeature({
  title,
  description,
  upgradeLabel,
}: {
  title: string;
  description: string;
  upgradeLabel: string;
}) {
  return (
    <section className="panel locked-feature border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-1rem grid-template-columns-auto-minmax-0-1fr-auto items-center in-p-2:margin-0p25rem-0-0 uv-max640:grid-template-columns-auto-minmax-0-1fr-2 uv-max640:in-button-2:grid-column-1-1 uv-max640:in-button-2:w-full uv-max640:in-button-2:justify-center rounded-exact-18px">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted text-uv-text-muted">{description}</p>
      </div>
      <UpgradeCta label={upgradeLabel} />
    </section>
  );
}

export function LimitReached({
  title,
  description,
  upgradeLabel,
}: {
  title: string;
  description: string;
  upgradeLabel: string;
}) {
  return (
    <section className="panel limit-reached border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-1rem grid-template-columns-auto-minmax-0-1fr-auto items-center in-p-2:margin-0p25rem-0-0 uv-max640:grid-template-columns-auto-minmax-0-1fr-2 uv-max640:in-button-2:grid-column-1-1 uv-max640:in-button-2:w-full uv-max640:in-button-2:justify-center rounded-exact-18px" role="status">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted text-uv-text-muted">{description}</p>
      </div>
      <UpgradeCta label={upgradeLabel} />
    </section>
  );
}
