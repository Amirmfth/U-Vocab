import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAuthPage, safeReturnTo } from "@/lib/auth-routing";

export async function middleware(request: NextRequest) {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null);
  const pathname = request.nextUrl.pathname;
  const authPage = isAuthPage(pathname);

  if (!session && !authPage) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "returnTo",
      pathname + request.nextUrl.search + request.nextUrl.hash,
    );
    return NextResponse.redirect(login);
  }

  if (session && authPage) {
    const destination = safeReturnTo(
      request.nextUrl.searchParams.get("returnTo"),
      "/",
    );
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
