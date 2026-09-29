import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isAuthPage } from "@/lib/auth-routing";

export async function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(
    getSessionCookie(request, { cookiePrefix: "u-vocab" }),
  );
  const pathname = request.nextUrl.pathname;
  const authPage = isAuthPage(pathname);

  if (!hasSessionCookie && !authPage) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "returnTo",
      pathname + request.nextUrl.search + request.nextUrl.hash,
    );
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
