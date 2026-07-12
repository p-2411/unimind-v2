import { auth } from "~/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  await auth.api.signOut({ headers: await headers() });
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
