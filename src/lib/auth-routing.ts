const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

export function isAuthPage(pathname: string) {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export function safeReturnTo(
  value: string | null | undefined,
  fallback = "/",
) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://u-vocab.local");
    if (parsed.origin !== "https://u-vocab.local" || isAuthPage(parsed.pathname)) {
      return fallback;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
