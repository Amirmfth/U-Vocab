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
    <div className="quota-remaining">
      <span>{label}</span>
      <strong>{remaining}</strong>
      <small>{used} / {limit}</small>
    </div>
  );
}

export function UpgradeCta({ label }: { label: string }) {
  return (
    <Link href="/settings#subscription" className="button button-primary">
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
    <section className="panel locked-feature">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
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
    <section className="panel limit-reached" role="status">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
      </div>
      <UpgradeCta label={upgradeLabel} />
    </section>
  );
}
