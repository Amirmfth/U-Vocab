const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "u_vocab_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = { username: string; expiresAt: number };

export function authDisabledForDevelopment() {
  return process.env.NODE_ENV !== "production" && process.env.APP_AUTH_DISABLED === "true";
}

function authCredentials() {
  const username = process.env.APP_AUTH_USERNAME?.trim();
  const password = process.env.APP_AUTH_PASSWORD;
  if (!username || !password) throw new Error("APP_AUTH_USERNAME and APP_AUTH_PASSWORD must be configured.");
  return { username, password };
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function key() {
  const { username, password } = authCredentials();
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`${username}\0${password}\0u-vocab-session-v1`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function constantTimeEqual(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function credentialsMatch(username: string, password: string) {
  if (authDisabledForDevelopment()) return true;
  const configured = authCredentials();
  const [u, p] = await Promise.all([
    constantTimeEqual(username, configured.username),
    constantTimeEqual(password, configured.password),
  ]);
  return u && p;
}

export async function createSessionToken(now = Date.now()) {
  const { username } = authCredentials();
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    username,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  } satisfies SessionPayload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload)));
  return payload + "." + toBase64Url(signature);
}

export async function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (authDisabledForDevelopment()) return true;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const [payload, signature] = parts;
    if (!(await crypto.subtle.verify("HMAC", await key(), fromBase64Url(signature), encoder.encode(payload)))) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Partial<SessionPayload>;
    const { username } = authCredentials();
    return typeof data.username === "string" &&
      typeof data.expiresAt === "number" &&
      data.expiresAt > now &&
      (await constantTimeEqual(data.username, username));
  } catch {
    return false;
  }
}
