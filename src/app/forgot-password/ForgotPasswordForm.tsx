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
    <form onSubmit={submit} className="panel login-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 width-min-100pct-420px flex flex-col gap-4.5 in-h1:margin-4px-0-8px in-h1:text-uv-faefb2e6859 in-h1:letter-spacing-0p045em in-p-2:m-0 in-p-2:line-height-1p5 rounded-uv-r6d27d54c6c">
      <div className="login-icon w-10.5 h-10.5 grid place-items-center border-1px-solid-border-2 rounded-uv-r233710a71e bg-uv-surface-raised text-uv-primary-strong" aria-hidden="true">
        <KeyRound size={22} />
      </div>
      <div>
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("auth.passwordResetEyebrow")}</p>
        <h1>{t("auth.forgotTitle")}</h1>
        <p className="muted text-uv-text-muted">{t("auth.forgotLongHelp")}</p>
      </div>

      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>

      {complete ? (
        <StatusNotice tone="success">{t("auth.resetSent")}</StatusNotice>
      ) : null}
      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}

      <button
        className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
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
