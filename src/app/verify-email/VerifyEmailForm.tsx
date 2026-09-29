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
    <form onSubmit={resend} className="panel login-card">
      <div className="login-icon" aria-hidden="true">
        <MailCheck size={22} />
      </div>
      <div>
        <p className="eyebrow">{t("auth.verifyEyebrow")}</p>
        <h1>{t("auth.checkInbox")}</h1>
        <p className="muted">{t("auth.verifyLongHelp")}</p>
      </div>

      {invalidToken ? (
        <StatusNotice tone="error">{t("auth.invalidVerification")}</StatusNotice>
      ) : null}
      {sent && !invalidToken ? (
        <StatusNotice tone="success">{t("auth.sentVerificationSafe")}</StatusNotice>
      ) : null}

      <label className="field">
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
      <button className="button button-secondary" type="submit" disabled={pending}>
        {pending ? t("auth.resending") : t("auth.resendVerification")}
      </button>
    </form>
  );
}
