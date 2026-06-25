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

    const [
      totalUsers,
      newUsersToday,
      totalAttempts,
      attemptsToday,
      correctAttempts,
      recentUsers,
      courses,
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
    };
  }),
});
