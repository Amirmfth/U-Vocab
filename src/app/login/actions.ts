"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, credentialsMatch, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth-session";

export type LoginState = { status: "idle" | "error"; message?: string };

function safeReturnTo(value: FormDataEntryValue | null) {
  const target = typeof value === "string" ? value : "/";
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/login")) return "/";
  return target;
}

async function shouldUseSecureSessionCookie() {
  const requestHeaders = await headers();
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedProtocol) return forwardedProtocol === "https";

  const host = requestHeaders.get("host") ?? "";
  const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  return process.env.NODE_ENV === "production" && !isLocalhost;
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { status: "error", message: "Enter the configured username and password." };

  let valid = false;
  try { valid = await credentialsMatch(username, password); }
  catch { return { status: "error", message: "Application authentication is not configured." }; }

  if (!valid) return { status: "error", message: "Invalid username or password." };

  const [store, secure] = await Promise.all([
    cookies(),
    shouldUseSecureSessionCookie(),
  ]);
  store.set(SESSION_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(safeReturnTo(formData.get("returnTo")));
}
