"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";

export function ForgotPasswordForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    setPending(true);
    setError(null);

    try {
      const redirectTo =
        "/reset-password?returnTo=" + encodeURIComponent(returnTo);
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo,
      });
      if (result.error) {
        setError(result.error.message || t("auth.resetRequestError"));
      } else {
        setComplete(true);
      }
    } catch {
      setError(t("auth.resetRequestError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel login-card">
      <div className="login-icon" aria-hidden="true">
        <KeyRound size={22} />
      </div>
      <div>
        <p className="eyebrow">{t("auth.passwordResetEyebrow")}</p>
        <h1>{t("auth.forgotTitle")}</h1>
        <p className="muted">{t("auth.forgotLongHelp")}</p>
      </div>

      <label className="field">
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>

      {complete ? (
        <StatusNotice tone="success">{t("auth.resetSent")}</StatusNotice>
      ) : null}
      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}

      <button
        className="button button-primary"
        type="submit"
        disabled={pending || complete}
      >
        {pending
          ? t("auth.sendingReset")
          : complete
            ? t("auth.emailSent")
            : t("auth.sendReset")}
      </button>
    </form>
  );
}
