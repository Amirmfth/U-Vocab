"use client";

import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";

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
        setError(result.error.message || "Could not send the verification email.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Could not send the verification email.");
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
        <p className="eyebrow">VERIFY EMAIL</p>
        <h1>Check your inbox</h1>
        <p className="muted">
          Open the U-Vocab verification link before signing in. Verification links expire after 24 hours.
        </p>
      </div>

      {invalidToken ? (
        <StatusNotice tone="error">
          That verification link is invalid or expired. Request a new one below.
        </StatusNotice>
      ) : null}
      {sent && !invalidToken ? (
        <StatusNotice tone="success">
          If the address can receive U-Vocab mail, a verification link has been sent.
        </StatusNotice>
      ) : null}

      <label className="field">
        <span>Email</span>
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
        {pending ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}
