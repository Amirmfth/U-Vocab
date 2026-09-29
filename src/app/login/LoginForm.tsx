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
    <form onSubmit={submit} className="panel login-card">
      <div className="login-icon" aria-hidden="true">
        <LockKeyhole size={22} />
      </div>
      <div>
        <p className="eyebrow">{t("auth.account")}</p>
        <h1>{t("auth.signInTitle")}</h1>
        <p className="muted">{t("auth.signInHelp")}</p>
      </div>

      {passwordReset ? (
        <StatusNotice tone="success">{t("auth.passwordUpdated")}</StatusNotice>
      ) : null}

      <label className="field">
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
      <label className="field">
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
          className="text-link"
        >
          {t("auth.resendVerification")}
        </Link>
      ) : null}

      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      <Link
        href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}
        className="text-link"
      >
        {t("auth.forgotPassword")}
      </Link>
    </form>
  );
}
