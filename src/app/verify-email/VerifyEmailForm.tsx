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
    <form onSubmit={resend} className="panel login-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-width-f23a05718e flex flex-col gap-4.5 uv-v3bccf64584:uv-margin-cebce9cc96 uv-v3bccf64584:text-uv-faefb2e6859 uv-v3bccf64584:uv-letter-spacing-71e7524560 uv-vb19eb067c9:m-0 uv-vb19eb067c9:uv-line-height-aa8f289ebe rounded-uv-r6d27d54c6c">
      <div className="login-icon w-10.5 h-10.5 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface-raised text-uv-primary-strong" aria-hidden="true">
        <MailCheck size={22} />
      </div>
      <div>
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("auth.verifyEyebrow")}</p>
        <h1>{t("auth.checkInbox")}</h1>
        <p className="muted text-uv-text-muted">{t("auth.verifyLongHelp")}</p>
      </div>

      {invalidToken ? (
        <StatusNotice tone="error">{t("auth.invalidVerification")}</StatusNotice>
      ) : null}
      {sent && !invalidToken ? (
        <StatusNotice tone="success">{t("auth.sentVerificationSafe")}</StatusNotice>
      ) : null}

      <label className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
      <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit" disabled={pending}>
        {pending ? t("auth.resending") : t("auth.resendVerification")}
      </button>
    </form>
  );
}
