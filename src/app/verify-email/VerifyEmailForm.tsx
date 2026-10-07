"use client";

import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";

export function VerifyEmailForm({
  email: initialEmail,
  returnTo,
  invalidToken,
}: {
  email: string;
  returnTo: string;
  invalidToken: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(Boolean(initialEmail) && !invalidToken);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: returnTo,
      });
      if (result.error) {
        setError(result.error.message || t("auth.sendVerificationError"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("auth.sendVerificationError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={resend} className="panel login-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:min(100%,_420px)] [display:flex] [flex-direction:column] [gap:18px] [&_h1]:[margin:4px_0_8px] [&_h1]:[font-size:clamp(1.8rem,_8vw,_2.6rem)] [&_h1]:[letter-spacing:-0.045em] [&_p]:[margin:0] [&_p]:[line-height:1.5] [border-radius:18px]">
      <div className="login-icon [width:42px] [height:42px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface-raised)] [color:var(--primary-strong)]" aria-hidden="true">
        <MailCheck size={22} />
      </div>
      <div>
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("auth.verifyEyebrow")}</p>
        <h1>{t("auth.checkInbox")}</h1>
        <p className="muted [color:var(--text-muted)]">{t("auth.verifyLongHelp")}</p>
      </div>

      {invalidToken ? (
        <StatusNotice tone="error">{t("auth.invalidVerification")}</StatusNotice>
      ) : null}
      {sent && !invalidToken ? (
        <StatusNotice tone="success">{t("auth.sentVerificationSafe")}</StatusNotice>
      ) : null}

      <label className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <span>{t("auth.email")}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </label>

      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
      <button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit" disabled={pending}>
        {pending ? t("auth.resending") : t("auth.resendVerification")}
      </button>
    </form>
  );
}
