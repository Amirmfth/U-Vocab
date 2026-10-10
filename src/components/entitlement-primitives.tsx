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
    <div className="quota-remaining grid uv-gap-f3b3ec19c5 uv-padding-ee84419642 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface uv-v22810335d8:text-uv-c7dbd63a13e uv-v69dadb8fcd:text-uv-c7dbd63a13e uv-ve6b262f465:text-uv-fa23d8869ee uv-ve6b262f465:uv-font-variant-numeric-3032cae0ba">
      <span>{label}</span>
      <strong>{remaining}</strong>
      <small>{used} / {limit}</small>
    </div>
  );
}

export function UpgradeCta({ label }: { label: string }) {
  return (
    <Link href="/settings#subscription" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
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
    <section className="panel locked-feature uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-19feeb881c uv-grid-template-columns-738a8da05d items-center uv-vb19eb067c9:uv-margin-350b4d9b2a uv-max640:uv-grid-template-columns-7089a0cef9 uv-max640:uv-vcded88c612:uv-grid-column-93b665dfb5 uv-max640:uv-vcded88c612:w-full uv-max640:uv-vcded88c612:justify-center rounded-uv-r6d27d54c6c">
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
    <section className="panel limit-reached uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-gap-19feeb881c uv-grid-template-columns-738a8da05d items-center uv-vb19eb067c9:uv-margin-350b4d9b2a uv-max640:uv-grid-template-columns-7089a0cef9 uv-max640:uv-vcded88c612:uv-grid-column-93b665dfb5 uv-max640:uv-vcded88c612:w-full uv-max640:uv-vcded88c612:justify-center rounded-uv-r6d27d54c6c" role="status">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted text-uv-text-muted">{description}</p>
      </div>
      <UpgradeCta label={upgradeLabel} />
    </section>
  );
}
