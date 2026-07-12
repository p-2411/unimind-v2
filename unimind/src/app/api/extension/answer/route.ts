import { NextResponse } from "next/server";
import { type Card, type Grade } from "ts-fsrs";
import { z } from "zod";
import { db } from "~/server/db";
import { applyAnswer, applyMastery } from "~/server/lib/scoring";
import { shuffleChoices } from "~/server/lib/shuffle";
import { auth } from "~/lib/auth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const session = await auth.api.getSession({
    headers: new Headers({ Authorization: authHeader }),
  });
  return session?.user.id ?? null;
}

const AnswerSchema = z.object({
  questionId: z.string(),
  choiceIndex: z.number().int().min(0),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  timeSpentMs: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const userId = await getUserId(req.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400, headers: CORS });
  }

  const input = parsed.data;

  const question = await db.question.findUnique({
    where: { id: input.questionId },
    select: {
      id: true,
      topicId: true,
      subtopicId: true,
      choices: true,
      answerIndex: true,
      explanation: true,
      topic: { select: { name: true } },
      difficulty: true,
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404, headers: CORS });
  }

  const { answerIndex: shuffledAnswerIndex } = shuffleChoices(
    question.id,
    question.choices,
    question.answerIndex,
  );
  const isCorrect = input.choiceIndex === shuffledAnswerIndex;
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  await db.$transaction(async (tx) => {
    const existingUq = await tx.userQuestion.findUnique({
      where: { userId_questionId: { userId, questionId: question.id } },
    });

    const prevCard: Card | null = existingUq
      ? {
          due: existingUq.due,
          stability: existingUq.stability,
          difficulty: existingUq.difficulty,
          elapsed_days: existingUq.elapsedDays,
          scheduled_days: existingUq.scheduledDays,
          learning_steps: existingUq.learningSteps,
          reps: existingUq.reps,
          lapses: existingUq.lapses,
          state: existingUq.state,
          last_review: existingUq.lastReview ?? undefined,
        }
      : null;

    const { card } = applyAnswer({
      prevCard,
      rating: input.rating as Grade,
      now,
    });

    await tx.userQuestion.upsert({
      where: { userId_questionId: { userId, questionId: question.id } },
      create: {
        userId,
        questionId: question.id,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        lastReview: card.last_review ?? null,
      },
      update: {
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        lastReview: card.last_review ?? null,
      },
    });

    await tx.questionAttempt.create({
      data: {
        userId,
        questionId: question.id,
        topicId: question.topicId,
        subtopicId: question.subtopicId,
        isCorrect,
        rating: input.rating,
        timeSpentMs: input.timeSpentMs,
        source: "paywall",
        answeredAt: now,
      },
    });

    const existingUt = await tx.userTopic.findUnique({
      where: { userId_topicId: { userId, topicId: question.topicId } },
      select: {
        masteryScore: true,
        masteryUpdatedAt: true,
        correctCount: true,
        totalCount: true,
      },
    });

    const existingUs = await tx.userStats.findUnique({
      where: { userId },
      select: {
        lastActiveDate: true,
        currentStreak: true,
        longestStreak: true,
        xp: true,
        level: true,
      },
    });

    const lastActiveDate = existingUs?.lastActiveDate;
    const currentStreak = existingUs?.currentStreak ?? 0;
    const longestStreak = existingUs?.longestStreak ?? 0;
    const prevScore = existingUt?.masteryScore ?? 50;
    let newStreak = currentStreak;
    let newLongestStreak = longestStreak;
    let xp = existingUs?.xp ?? 0;
    let level = existingUs?.level ?? 0;
    const prevUpdatedAt = existingUt?.masteryUpdatedAt ?? now;

    const { masteryScore, masteryUpdatedAt } = applyMastery({
      prevScore,
      prevUpdatedAt,
      isCorrect,
      now,
      difficulty: question.difficulty,
    });

    const correctCount = (existingUt?.correctCount ?? 0) + (isCorrect ? 1 : 0);
    const totalCount = (existingUt?.totalCount ?? 0) + 1;

    await tx.userTopic.upsert({
      where: { userId_topicId: { userId, topicId: question.topicId } },
      create: {
        userId,
        topicId: question.topicId,
        topicName: question.topic.name,
        masteryScore,
        masteryUpdatedAt,
        correctCount,
        totalCount,
        lastAnsweredAt: now,
      },
      update: {
        masteryScore,
        masteryUpdatedAt,
        correctCount,
        totalCount,
        lastAnsweredAt: now,
      },
    });

    if (!lastActiveDate) {
      newStreak = 1;
    } else if (today.getTime() - lastActiveDate.getTime() === 86400000) {
      newStreak += 1;
    } else if (today.getTime() - lastActiveDate.getTime() > 86400000) {
      newStreak = 1;
    }

    if (newStreak > longestStreak) newLongestStreak = newStreak;

    const xpGain = isCorrect
      ? question.difficulty === 1 ? 16 : question.difficulty === 2 ? 24 : 40
      : question.difficulty === 1 ? 1 : question.difficulty === 2 ? 2 : 4;

    xp += xpGain;
    if (newStreak % 10 === 0 && newStreak !== 0) xp += 100;
    if (prevScore < 95 && masteryScore >= 95) xp += 250;
    level = Math.floor(Math.sqrt(xp / 50));

    await tx.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalQuestionsAnswered: 1,
        totalCorrectAnswers: isCorrect ? 1 : 0,
        totalTimeSpent: input.timeSpentMs,
        lastActiveDate: today,
        currentStreak: 1,
        longestStreak: 1,
        xp: 0,
        level: 0,
      },
      update: {
        totalQuestionsAnswered: { increment: 1 },
        totalCorrectAnswers: { increment: isCorrect ? 1 : 0 },
        totalTimeSpent: { increment: input.timeSpentMs },
        lastActiveDate: today,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        xp,
        level,
      },
    });
  });

  return NextResponse.json(
    {
      isCorrect,
      answerIndex: shuffledAnswerIndex,
      explanation: question.explanation,
    },
    { status: 200, headers: CORS },
  );
}
