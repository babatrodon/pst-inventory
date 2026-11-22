import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Public sign-up stays closed: the admin creates accounts inside the app.
  if (pathname.startsWith("/api/auth/sign-up")) {
    return NextResponse.json({ error: "Sign-up is disabled" }, { status: 404 });
  }
  if (pathname.startsWith("/api/auth") || pathname === "/login") return NextResponse.next();
  const cookie = getSessionCookie(req);
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)"],
};
