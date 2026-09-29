"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";

export function ResetPasswordForm({
  token,
  returnTo,
  invalidToken,
}: {
  token: string;
  returnTo: string;
  invalidToken: boolean;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    invalidToken || !token
      ? t("auth.invalidReset")
      : null,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError(result.error.message || t("auth.resetError"));
        return;
      }
      router.replace(
        "/login?reset=1&returnTo=" + encodeURIComponent(returnTo),
      );
    } catch {
      setError(t("auth.resetError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel login-card">
      <div className="login-icon" aria-hidden="true">
        <ShieldCheck size={22} />
      </div>
      <div>
        <p className="eyebrow">{t("auth.newPasswordEyebrow")}</p>
        <h1>{t("auth.resetTitle")}</h1>
        <p className="muted">{t("auth.resetLongHelp")}</p>
      </div>

      <label className="field">
        <span>{t("auth.newPassword")}</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          disabled={!token}
        />
      </label>
      <label className="field">
        <span>{t("auth.confirmNewPassword")}</span>
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          disabled={!token}
        />
      </label>

      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}

      <button
        className="button button-primary"
        type="submit"
        disabled={pending || !token}
      >
        {pending ? t("auth.updatingPassword") : t("auth.updatePassword")}
      </button>
    </form>
  );
}
