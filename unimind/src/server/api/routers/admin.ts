import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

async function requireAdmin(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  const isAdmin = user?.email
    ? await db.admin.findUnique({ where: { email: user.email } })
    : null;
  if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Not an admin" });
}

export const adminRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx.db, ctx.session.user.id);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersToday,
      totalAttempts,
      attemptsToday,
      correctAttempts,
      recentUsers,
      courses,
      dailyRaw,
      topTopicsRaw,
      difficultyRaw,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { createdAt: { gte: startOfToday } } }),
      ctx.db.questionAttempt.count(),
      ctx.db.questionAttempt.count({ where: { answeredAt: { gte: startOfToday } } }),
      ctx.db.questionAttempt.count({ where: { isCorrect: true } }),
      ctx.db.user.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: { select: { userCourses: true } },
        },
      }),
      ctx.db.course.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { userCourses: true } },
          topics: {
            select: {
              _count: { select: { attempts: true } },
              userTopics: { select: { masteryScore: true } },
            },
          },
        },
      }),
      ctx.db.$queryRaw<{ day: Date; attempts: bigint }[]>`
        SELECT DATE("answeredAt") AS day, COUNT(*) AS attempts
        FROM "question_attempts"
        WHERE "answeredAt" >= ${sevenDaysAgo}
        GROUP BY DATE("answeredAt")
        ORDER BY day ASC
      `,
      ctx.db.$queryRaw<{ topicId: string; attempts: bigint; correct: bigint }[]>`
        SELECT "topicId", COUNT(*) AS attempts,
               SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) AS correct
        FROM "question_attempts"
        GROUP BY "topicId"
        ORDER BY attempts DESC
        LIMIT 5
      `,
      ctx.db.$queryRaw<{ difficulty: number; attempts: bigint; correct: bigint }[]>`
        SELECT q.difficulty, COUNT(*) AS attempts,
               SUM(CASE WHEN qa."isCorrect" THEN 1 ELSE 0 END) AS correct
        FROM "question_attempts" qa
        JOIN "questions" q ON q.id = qa."questionId"
        GROUP BY q.difficulty
        ORDER BY q.difficulty ASC
      `,
    ]);

    const accuracy =
      totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;

    const courseStats = courses.map((c) => {
      const attempts = c.topics.reduce((sum, t) => sum + t._count.attempts, 0);
      const mastery = c.topics.flatMap((t) => t.userTopics.map((ut) => ut.masteryScore));
      const avgMastery =
        mastery.length > 0
          ? Math.round(mastery.reduce((a, b) => a + b, 0) / mastery.length)
          : null;
      return { id: c.id, name: c.name, enrolled: c._count.userCourses, attempts, avgMastery };
    });

    // Fill all 7 days, including days with zero attempts
    const dailyMap = new Map(
      dailyRaw.map((r) => [r.day.toISOString().slice(0, 10), Number(r.attempts)]),
    );
    const daily = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        day: d.toLocaleDateString("en-AU", { weekday: "short" }),
        attempts: dailyMap.get(key) ?? 0,
      };
    });

    // Join top topics with topic names
    const topicNames = await ctx.db.topic.findMany({
      where: { id: { in: topTopicsRaw.map((t) => t.topicId) } },
      select: { id: true, name: true },
    });
    const topicNameMap = new Map(topicNames.map((t) => [t.id, t.name]));
    const topTopics = topTopicsRaw.map((t) => ({
      name: topicNameMap.get(t.topicId) ?? t.topicId,
      attempts: Number(t.attempts),
      accuracy: Number(t.attempts) > 0
        ? Math.round((Number(t.correct) / Number(t.attempts)) * 100)
        : 0,
    }));

    const difficultyLabels = ["Easy", "Medium", "Hard"] as const;
    const difficulty = ([1, 2, 3] as const).map((d) => {
      const row = difficultyRaw.find((r) => Number(r.difficulty) === d);
      return {
        label: difficultyLabels[d - 1],
        count: row ? Number(row.attempts) : 0,
        accuracy: row && Number(row.attempts) > 0
          ? Math.round((Number(row.correct) / Number(row.attempts)) * 100)
          : 0,
      };
    });

    return {
      totalUsers,
      newUsersToday,
      totalAttempts,
      attemptsToday,
      accuracy,
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        joinedAt: u.createdAt,
        courseCount: u._count.userCourses,
      })),
      courses: courseStats,
      daily,
      topTopics,
      difficulty,
    };
  }),
});
