import { auth } from "~/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isExtensionApi = pathname.startsWith("/api/extension");

  // Skip session check for routes that don't need it
  if (isAuthApi || isExtensionApi) return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && isAuthPage) {
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
