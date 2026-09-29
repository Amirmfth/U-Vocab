"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    invalidToken || !token
      ? "This password reset link is invalid or expired."
      : null,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Passwords do not match.");
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
        setError(result.error.message || "Could not reset the password.");
        return;
      }
      router.replace(
        "/login?reset=1&returnTo=" + encodeURIComponent(returnTo),
      );
    } catch {
      setError("Could not reset the password.");
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
        <p className="eyebrow">NEW PASSWORD</p>
        <h1>Choose a new password</h1>
        <p className="muted">
          Use 10–128 characters. Resetting the password revokes existing sessions.
        </p>
      </div>

      <label className="field">
        <span>New password</span>
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
        <span>Confirm new password</span>
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
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
