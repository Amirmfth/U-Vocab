import { NextRequest, NextResponse } from "next/server";
import { authDisabledForDevelopment, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export async function middleware(request: NextRequest) {
  if (authDisabledForDevelopment()) return NextResponse.next();

  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    if (!authenticated) return NextResponse.next();
    const requested = request.nextUrl.searchParams.get("returnTo");
    const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("returnTo", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
