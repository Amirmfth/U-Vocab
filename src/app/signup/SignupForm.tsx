"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { StatusNotice } from "@/components/status-notice";

export function SignupForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password !== confirmation) {
      setError("Passwords do not match.");
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
        setError(result.error.message || "Could not create your account.");
        return;
      }

      router.replace(
        "/verify-email?email=" +
          encodeURIComponent(email) +
          "&returnTo=" +
          encodeURIComponent(returnTo),
      );
    } catch {
      setError("Could not create your account. Check your connection and try again.");
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
        <p className="eyebrow">NEW ACCOUNT</p>
        <h1>Create your U-Vocab account</h1>
        <p className="muted">
          Your vocabulary, reviews, and learning history stay attached to your account.
        </p>
      </div>

      <label className="field">
        <span>Name</span>
        <input name="name" autoComplete="name" required maxLength={100} />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span>Password</span>
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
        <span>Confirm password</span>
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
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
