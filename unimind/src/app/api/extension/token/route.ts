import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({
      token: null,
      expiresAt: null,
      reminderEnabled: false,
      reminderTime: "09:00",
    });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { dailyReminderEnabled: true, dailyReminderTime: true },
  });

  return NextResponse.json({
    token: session.session.token,
    expiresAt: Math.floor(new Date(session.session.expiresAt).getTime() / 1000),
    reminderEnabled: user?.dailyReminderEnabled ?? false,
    reminderTime: user?.dailyReminderTime ?? "09:00",
  });
}
