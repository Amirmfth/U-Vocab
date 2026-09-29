"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";

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
            ? "Verify your email before signing in. We sent a new verification link."
            : result.error.message || "Could not sign in.",
        );
        return;
      }

      window.location.replace(returnTo);
    } catch {
      setError("Could not sign in. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel login-card">
      <div className="login-icon" aria-hidden="true">
        <LockKeyhole size={22} />
      </div>
      <div>
        <p className="eyebrow">ACCOUNT</p>
        <h1>Sign in to U-Vocab</h1>
        <p className="muted">Use your U-Vocab email and password.</p>
      </div>

      {passwordReset ? (
        <StatusNotice tone="success">
          Password updated. Sign in with your new password.
        </StatusNotice>
      ) : null}

      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Password</span>
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
          className="text-link"
        >
          Resend verification email
        </Link>
      ) : null}

      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <Link
        href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}
        className="text-link"
      >
        Forgot password?
      </Link>
    </form>
  );
}
