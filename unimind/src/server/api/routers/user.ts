import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const CALIBRATION_THRESHOLD = 10;
const TOPICS_COVERED_WINDOW_DAYS = 7;

export const userRouter = createTRPCRouter({
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [userStats, userTopics] = await Promise.all([
      ctx.db.userStats.findUnique({ where: { userId } }),
      ctx.db.userTopic.findMany({
        where: { userId },
        select: {
          topicId: true,
          topicName: true,
          score: true,
          correctCount: true,
          totalCount: true,
          lastAnsweredAt: true,
        },
      }),
    ]);

    const totalAnswers = userTopics.reduce((sum, t) => sum + t.totalCount, 0);
    const topicsStarted = userTopics.length;

    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - TOPICS_COVERED_WINDOW_DAYS);
    const topicsCoveredThisWeek = userTopics.filter(
      (t) => t.lastAnsweredAt && t.lastAnsweredAt >= weekAgo,
    ).length;

    const accuracy =
      totalAnswers < CALIBRATION_THRESHOLD || topicsStarted === 0
        ? null
        : Math.round(
            userTopics.reduce((sum, t) => sum + t.score, 0) / topicsStarted,
          );

    const topicMastery = [...userTopics]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((t) => ({
        topicId: t.topicId,
        name: t.topicName,
        score: t.score,
        correctCount: t.correctCount,
        totalCount: t.totalCount,
      }));

    return {
      topicsStarted,
      topicsCoveredThisWeek,
      totalAnswers,
      accuracy,
      currentStreak: userStats?.currentStreak ?? 0,
      longestStreak: userStats?.longestStreak ?? 0,
      level: userStats?.level ?? 1,
      xp: userStats?.xp ?? 0,
      topicMastery,
      calibrationThreshold: CALIBRATION_THRESHOLD,
    };
  }),

  enrollCourses: protectedProcedure
    .input(z.object({ courseIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.userCourse.createMany({
        data: input.courseIds.map((courseId) => ({
          userId: ctx.session.user.id,
          courseId,
        })),
        skipDuplicates: true,
      });
      return { count: result.count };
    }),
});
