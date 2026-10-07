"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";

export function LoginForm({
  returnTo,
  passwordReset,
}: {
  returnTo: string;
  passwordReset: boolean;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const t = useTranslations();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError(null);
    setNeedsVerification(false);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true,
        callbackURL: returnTo,
      });

      if (result.error) {
        const emailNotVerified = result.error.code === "EMAIL_NOT_VERIFIED";
        setNeedsVerification(emailNotVerified);
        setError(
          emailNotVerified
            ? t("auth.verifyBeforeSignIn")
            : result.error.message || t("auth.signInError"),
        );
        return;
      }

      window.location.replace(returnTo);
    } catch {
      setError(t("auth.signInConnectionError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel login-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:min(100%,_420px)] [display:flex] [flex-direction:column] [gap:18px] [&_h1]:[margin:4px_0_8px] [&_h1]:[font-size:clamp(1.8rem,_8vw,_2.6rem)] [&_h1]:[letter-spacing:-0.045em] [&_p]:[margin:0] [&_p]:[line-height:1.5] [border-radius:18px]">
      <div className="login-icon [width:42px] [height:42px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface-raised)] [color:var(--primary-strong)]" aria-hidden="true">
        <LockKeyhole size={22} />
      </div>
      <div>
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("auth.account")}</p>
        <h1>{t("auth.signInTitle")}</h1>
        <p className="muted [color:var(--text-muted)]">{t("auth.signInHelp")}</p>
      </div>

      {passwordReset ? (
        <StatusNotice tone="success">{t("auth.passwordUpdated")}</StatusNotice>
      ) : null}

      <label className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <span>{t("auth.email")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <span>{t("auth.password")}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>

      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
      {needsVerification && email ? (
        <Link
          href={
            "/verify-email?email=" +
            encodeURIComponent(email) +
            "&returnTo=" +
            encodeURIComponent(returnTo)
          }
          className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]"
        >
          {t("auth.resendVerification")}
        </Link>
      ) : null}

      <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      <Link
        href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}
        className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]"
      >
        {t("auth.forgotPassword")}
      </Link>
    </form>
  );
}
