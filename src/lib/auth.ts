import { cookies } from "next/headers";
import { authDisabledForDevelopment, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export async function isAppAuthenticated() {
  if (authDisabledForDevelopment()) return true;
  try {
    const store = await cookies();
    return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    return false;
  }
}

export async function requireAppAuth() {
  if (!(await isAppAuthenticated())) throw new Error("Unauthorized");
}
