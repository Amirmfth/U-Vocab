"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action] = useActionState(login, initialState);
  return (
    <form action={action} className="panel login-card">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="login-icon" aria-hidden="true"><LockKeyhole size={22} /></div>
      <div>
        <p className="eyebrow">PRIVATE APP</p>
        <h1>Sign in to U-Vocab</h1>
        <p className="muted">Use the shared credentials configured for this deployment.</p>
      </div>
      <label className="field"><span>Username</span><input name="username" autoComplete="username" required /></label>
      <label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
      {state.status === "error" ? <StatusNotice tone="error">{state.message}</StatusNotice> : null}
      <ActionButton pendingLabel="Signing in…">Sign in</ActionButton>
    </form>
  );
}
