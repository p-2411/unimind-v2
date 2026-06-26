import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return NextResponse.json({
    token: session?.access_token ?? null,
    expiresAt: session?.expires_at ?? null,
  });
}
