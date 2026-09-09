import { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { middleware } from "./middleware";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));
jest.mock("~/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
  },
}));

type CookieAdapter = {
  cookies: {
    setAll: (
      cookies: { name: string; value: string; options: CookieOptions }[],
      headers: Record<string, string>,
    ) => void;
  };
};

describe("middleware auth refresh", () => {
  it.each([
    { path: "/login", authenticated: true, target: "/" },
    { path: "/questions", authenticated: false, target: "/login" },
    { path: "/api/trpc/user.count", authenticated: false, target: null },
    { path: "/questions", authenticated: true, target: null },
  ])("preserves cookies/headers on $path (authenticated=$authenticated)", async ({ path, authenticated, target }) => {
    jest.mocked(createServerClient).mockImplementation(((_url: string, _key: string, adapter: CookieAdapter) => ({
      auth: {
        getClaims: async () => {
          adapter.cookies.setAll([
            { name: "test-auth", value: "rotated", options: {
              path: "/", httpOnly: true, secure: true, sameSite: "lax",
            } },
          ], { "Cache-Control": "private, no-store" });
          return { data: { claims: authenticated ? { sub: "test-user" } : null } };
        },
      },
    })) as unknown as typeof createServerClient);

    const response = await middleware(new NextRequest(`https://example.invalid${path}`));
    expect(response.cookies.get("test-auth")).toMatchObject({
      value: "rotated", path: "/", httpOnly: true, secure: true, sameSite: "lax",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    if (target) {
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`https://example.invalid${target}`);
      expect(response.headers.get("x-middleware-next")).toBeNull();
    } else {
      expect(response.headers.get("location")).toBeNull();
    }
  });
});
