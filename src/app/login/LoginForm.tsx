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
    <form onSubmit={submit} className="panel login-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-width-f23a05718e flex flex-col gap-4.5 uv-v3bccf64584:uv-margin-cebce9cc96 uv-v3bccf64584:text-uv-faefb2e6859 uv-v3bccf64584:uv-letter-spacing-71e7524560 uv-vb19eb067c9:m-0 uv-vb19eb067c9:uv-line-height-aa8f289ebe rounded-uv-r6d27d54c6c">
      <div className="login-icon w-10.5 h-10.5 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface-raised text-uv-primary-strong" aria-hidden="true">
        <LockKeyhole size={22} />
      </div>
      <div>
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("auth.account")}</p>
        <h1>{t("auth.signInTitle")}</h1>
        <p className="muted text-uv-text-muted">{t("auth.signInHelp")}</p>
      </div>

      {passwordReset ? (
        <StatusNotice tone="success">{t("auth.passwordUpdated")}</StatusNotice>
      ) : null}

      <label className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
      <label className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
          className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5"
        >
          {t("auth.resendVerification")}
        </Link>
      ) : null}

      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      <Link
        href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}
        className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5"
      >
        {t("auth.forgotPassword")}
      </Link>
    </form>
  );
}
