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
    <div className="quota-remaining [display:grid] [gap:0.2rem] [padding:0.9rem] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [&_>_span]:[color:var(--muted)] [&_>_small]:[color:var(--muted)] [&_>_strong]:[font-size:1.5rem] [&_>_strong]:[font-variant-numeric:tabular-nums]">
      <span>{label}</span>
      <strong>{remaining}</strong>
      <small>{used} / {limit}</small>
    </div>
  );
}

export function UpgradeCta({ label }: { label: string }) {
  return (
    <Link href="/settings#subscription" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
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
    <section className="panel locked-feature [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:1rem] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [&_p]:[margin:0.25rem_0_0] max-[640px]:[grid-template-columns:auto_minmax(0,_1fr)] max-[640px]:[&_.button]:[grid-column:1_/_-1] max-[640px]:[&_.button]:[width:100%] max-[640px]:[&_.button]:[justify-content:center] [border-radius:18px]">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted [color:var(--text-muted)]">{description}</p>
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
    <section className="panel limit-reached [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:1rem] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [&_p]:[margin:0.25rem_0_0] max-[640px]:[grid-template-columns:auto_minmax(0,_1fr)] max-[640px]:[&_.button]:[grid-column:1_/_-1] max-[640px]:[&_.button]:[width:100%] max-[640px]:[&_.button]:[justify-content:center] [border-radius:18px]" role="status">
      <LockKeyhole size={20} />
      <div>
        <strong>{title}</strong>
        <p className="muted [color:var(--text-muted)]">{description}</p>
      </div>
      <UpgradeCta label={upgradeLabel} />
    </section>
  );
}
