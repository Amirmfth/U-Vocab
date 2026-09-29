import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { sendAuthEmail } from "@/lib/auth-email";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

function trustedOrigins() {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export const auth = betterAuth({
  appName: "U-Vocab",
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    modelName: "User",
  },
  session: {
    modelName: "Session",
    expiresIn: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        kind: "password-reset",
        to: user.email,
        subject: "Reset your U-Vocab password",
        text: `Reset your U-Vocab password using this link:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        kind: "email-verification",
        to: user.email,
        subject: "Verify your U-Vocab email",
        text: `Verify your U-Vocab email using this link:\n\n${url}\n\nIf you did not create this account, you can ignore this email.`,
        url,
      });
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "RateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "u-vocab",
    database: {
      joins: true,
    },
  },
  ...(trustedOrigins().length ? { trustedOrigins: trustedOrigins() } : {}),
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export const getAuthSession = cache(async function getAuthSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch {
    return null;
  }
});

export async function isAppAuthenticated() {
  return Boolean(await getAuthSession());
}

export async function requireAppAuth() {
  const session = await getAuthSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
