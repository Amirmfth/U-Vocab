"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";

export function SignupForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password !== confirmation) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: returnTo,
      });

      if (result.error) {
        setError(result.error.message || t("auth.createError"));
        return;
      }

      router.replace(
        "/verify-email?email=" +
          encodeURIComponent(email) +
          "&returnTo=" +
          encodeURIComponent(returnTo),
      );
    } catch {
      setError(t("auth.createConnectionError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel login-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 width-min-100pct-420px flex flex-col gap-4.5 in-h1:margin-4px-0-8px in-h1:text-exact-clamp-1p8rem-8vw-2p6rem in-h1:letter-spacing-0p045em in-p-2:m-0 in-p-2:line-height-1p5 rounded-exact-18px">
      <div className="login-icon w-10.5 h-10.5 grid place-items-center border-1px-solid-border-2 rounded-exact-13px bg-uv-surface-raised text-uv-primary-strong" aria-hidden="true">
        <UserPlus size={22} />
      </div>
      <div>
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("auth.newAccount")}</p>
        <h1>{t("auth.createTitle")}</h1>
        <p className="muted text-uv-text-muted">{t("auth.createHelp")}</p>
      </div>

      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <span>{t("auth.name")}</span>
        <input name="name" autoComplete="name" required maxLength={100} />
      </label>
      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <span>{t("auth.password")}</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>
      <label className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560">
        <span>{t("auth.confirmPassword")}</span>
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </label>

      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}

      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="submit" disabled={pending}>
        {pending ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>
    </form>
  );
}
