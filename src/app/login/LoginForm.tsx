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
    <form onSubmit={submit} className="panel login-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 width-min-100pct-420px flex flex-col gap-4.5 in-h1:margin-4px-0-8px in-h1:text-exact-clamp-1p8rem-8vw-2p6rem in-h1:letter-spacing-0p045em in-p-2:m-0 in-p-2:line-height-1p5 rounded-exact-18px">
      <div className="login-icon w-10.5 h-10.5 grid place-items-center border-1px-solid-border-2 rounded-exact-13px bg-uv-surface-raised text-uv-primary-strong" aria-hidden="true">
        <LockKeyhole size={22} />
      </div>
      <div>
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("auth.account")}</p>
        <h1>{t("auth.signInTitle")}</h1>
        <p className="muted text-uv-text-muted">{t("auth.signInHelp")}</p>
      </div>

      {passwordReset ? (
        <StatusNotice tone="success">{t("auth.passwordUpdated")}</StatusNotice>
      ) : null}

      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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
      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
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
          className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5"
        >
          {t("auth.resendVerification")}
        </Link>
      ) : null}

      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      <Link
        href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}
        className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5"
      >
        {t("auth.forgotPassword")}
      </Link>
    </form>
  );
}
