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
    <form onSubmit={submit} className="panel login-card">
      <div className="login-icon" aria-hidden="true">
        <UserPlus size={22} />
      </div>
      <div>
        <p className="eyebrow">{t("auth.newAccount")}</p>
        <h1>{t("auth.createTitle")}</h1>
        <p className="muted">{t("auth.createHelp")}</p>
      </div>

      <label className="field">
        <span>{t("auth.name")}</span>
        <input name="name" autoComplete="name" required maxLength={100} />
      </label>
      <label className="field">
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
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
      <label className="field">
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

      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>
    </form>
  );
}
