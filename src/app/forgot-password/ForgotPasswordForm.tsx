"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";

export function ForgotPasswordForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(result.error.message || "Could not request a password reset.");
      } else {
        setComplete(true);
      }
    } catch {
      setError("Could not request a password reset.");
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
        <p className="eyebrow">PASSWORD RESET</p>
        <h1>Reset your password</h1>
        <p className="muted">
          Enter your account email. We will send a reset link if an account can use password reset.
        </p>
      </div>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>

      {complete ? (
        <StatusNotice tone="success">
          If the account exists, a password reset email has been sent.
        </StatusNotice>
      ) : null}
      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}

      <button
        className="button button-primary"
        type="submit"
        disabled={pending || complete}
      >
        {pending ? "Sending…" : complete ? "Email sent" : "Send reset link"}
      </button>
    </form>
  );
}
