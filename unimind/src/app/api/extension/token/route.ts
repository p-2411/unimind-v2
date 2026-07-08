import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { env } from "~/env";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({
      token: null,
      expiresAt: null,
      refreshToken: null,
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      reminderEnabled: false,
      reminderTime: "09:00",
    });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { dailyReminderEnabled: true, dailyReminderTime: true },
  });

  return NextResponse.json({
    token: session.access_token,
    expiresAt: session.expires_at,
    refreshToken: session.refresh_token,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    reminderEnabled: user?.dailyReminderEnabled ?? false,
    reminderTime: user?.dailyReminderTime ?? "09:00",
  });
}
