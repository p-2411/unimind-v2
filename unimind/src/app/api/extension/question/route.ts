import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { pickNextQuestionId } from "~/server/lib/scoring";
import { shuffleChoices } from "~/server/lib/shuffle";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserId(req.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const questionId = await pickNextQuestionId(db, userId);
  if (!questionId) {
    return NextResponse.json({ question: null }, { status: 200, headers: CORS });
  }

  const q = await db.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      question: true,
      choices: true,
      answerIndex: true,
      difficulty: true,
      topic: {
        select: { id: true, name: true, course: { select: { name: true } } },
      },
      subtopic: { select: { id: true, name: true } },
    },
  });
  if (!q) return NextResponse.json({ question: null }, { status: 200, headers: CORS });

  const { choices } = shuffleChoices(q.id, q.choices, q.answerIndex);
  const { answerIndex: _, ...rest } = { ...q, choices };
  return NextResponse.json({ question: rest }, { status: 200, headers: CORS });
}
