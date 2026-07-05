import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await getUserId(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { disabledDefaults: true, customBlocked: true },
  });

  return NextResponse.json(
    { disabledDefaults: user?.disabledDefaults ?? [], customBlocked: user?.customBlocked ?? [] },
    { headers: CORS },
  );
}

export async function POST(request: Request) {
  const userId = await getUserId(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = (await request.json()) as { disabledDefaults?: string[]; customBlocked?: string[] };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { disabledDefaults: true, customBlocked: true },
  });

  await db.user.update({
    where: { id: userId },
    data: {
      disabledDefaults: body.disabledDefaults ?? user?.disabledDefaults ?? [],
      customBlocked: body.customBlocked ?? user?.customBlocked ?? [],
    },
  });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
