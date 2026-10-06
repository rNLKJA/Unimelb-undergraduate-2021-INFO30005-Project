import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookies";

/**
 * Optimistic auth redirects (Next.js "proxy", formerly middleware): send
 * visitors without a session cookie straight to the right login page with a
 * real 307. Pages still verify the signed session and the account on the server.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const has = (name: string) => Boolean(request.cookies.get(name)?.value);

  if (
    pathname.startsWith("/vendor") &&
    pathname !== "/vendor/login" &&
    !has(SESSION_COOKIE.vendor)
  ) {
    return NextResponse.redirect(new URL("/vendor/login", request.url));
  }
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !has(SESSION_COOKIE.admin)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (
    (pathname.startsWith("/customer/orders") || pathname === "/customer/profile") &&
    !has(SESSION_COOKIE.customer)
  ) {
    const url = new URL("/customer/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/vendor/:path*", "/admin/:path*", "/customer/orders/:path*", "/customer/profile"],
};
