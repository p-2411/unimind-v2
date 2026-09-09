import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "~/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Headers @supabase/ssr asks us to set alongside refreshed auth cookies
  // (cache-control etc.). Kept separately so redirects can carry them too.
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          authHeaders = headers ?? {};
          Object.entries(authHeaders).forEach(([k, v]) =>
            response.headers.set(k, v),
          );
        },
      },
    },
  );

  // A redirect must carry any cookies refreshed above, otherwise the consumed
  // refresh token is lost and the client ends up in a logout/redirect loop.
  function redirectWithCookies(url: URL) {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(authHeaders).forEach(([k, v]) => redirect.headers.set(k, v));
    return redirect;
  }

  // IMPORTANT: Do not place any code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === "/login" || pathname === "/signup";
  const isAuthApi = pathname.startsWith("/auth");
  // API routes are never redirected to the HTML login page: tRPC decides
  // per-procedure (protected ones throw UNAUTHORIZED, public ones still work).
  // Cookie refresh above still applies to these requests.
  const isApi = pathname.startsWith("/api");

  if (!user && !isAuthPage && !isAuthApi && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return redirectWithCookies(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
