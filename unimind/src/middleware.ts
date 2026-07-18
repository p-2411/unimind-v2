import { NextResponse, type NextRequest } from "next/server";

// Middleware runs on Edge runtime — no Prisma/DB calls allowed here.
// Cookie existence is checked here for redirects; actual session verification
// happens in the tRPC context on every server request.
const SESSION_COOKIE = "better-auth.session_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  const isPublicPage = pathname === "/privacy";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isExtensionApi = pathname.startsWith("/api/extension");

  if (isAuthApi || isExtensionApi || isPublicPage) return NextResponse.next();

  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;

  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
