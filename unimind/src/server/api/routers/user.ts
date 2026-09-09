import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { readMastery } from "~/server/lib/scoring";
import {
  getAchievementProgress,
  effectiveStreak,
  loadAchievementContext,
} from "~/server/lib/gamification";

const CALIBRATION_THRESHOLD = 10;
const TOPICS_COVERED_WINDOW_DAYS = 7;

export const userRouter = createTRPCRouter({
  count: publicProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.user.count();
    return { count };
  }),

  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [userStats, userTopics] = await Promise.all([
      ctx.db.userStats.findUnique({ where: { userId } }),
      ctx.db.userTopic.findMany({
        where: { userId },
        select: {
          topicId: true,
          topicName: true,
          masteryScore: true,
          masteryUpdatedAt: true,
          correctCount: true,
          totalCount: true,
          lastAnsweredAt: true,
        },
      }),
    ]);

    const weekAgo = new Date(
      Date.now() - TOPICS_COVERED_WINDOW_DAYS * 86_400_000,
    );

    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    let totalAnswers = 0;
    let scoreSum = 0;
    let topicsCoveredThisWeek = 0;
    for (const t of userTopics) {
      totalAnswers += t.totalCount;
      scoreSum += readMastery({
        score: t.masteryScore,
        updatedAt: t.masteryUpdatedAt,
        now,
      });
      if (t.lastAnsweredAt && t.lastAnsweredAt >= weekAgo) {
        topicsCoveredThisWeek += 1;
      }
    }
    const topicsStarted = userTopics.length;

    const accuracy =
      totalAnswers < CALIBRATION_THRESHOLD || topicsStarted === 0
        ? null
        : Math.round(scoreSum / topicsStarted);

    const topicMastery = userTopics
      .map((t) => ({
        topicId: t.topicId,
        name: t.topicName,
        score: Math.round(
          readMastery({
            score: t.masteryScore,
            updatedAt: t.masteryUpdatedAt,
            now,
          }),
        ),
        correctCount: t.correctCount,
        totalCount: t.totalCount,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const [allAchievements, allEarnedRows, snapshot] = await Promise.all([
      ctx.db.achievement.findMany({
        orderBy: [{ category: "asc" }, { tier: "asc" }, { code: "asc" }],
      }),
      ctx.db.userAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        include: {
          achievement: {
            select: { id: true, code: true, name: true, description: true, iconKey: true, xpReward: true },
          },
        },
      }),
      loadAchievementContext(ctx.db, userId, { now, stats: userStats }),
    ]);

    const earnedIdSet = new Set(allEarnedRows.map((r) => r.achievementId));

    const nextClosest = allAchievements
      .filter((a) => !earnedIdSet.has(a.id))
      .map((a) => ({
        achievement: {
          id: a.id,
          code: a.code,
          name: a.name,
          description: a.description,
          iconKey: a.iconKey,
          xpReward: a.xpReward,
        },
        progress: getAchievementProgress(a.code, snapshot),
      }))
      .filter((x) => x.progress !== null)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
      .slice(0, 3);

    const recentEarned = allEarnedRows.slice(0, 3).map((r) => ({
      achievement: r.achievement,
      earnedAt: r.earnedAt,
    }));

    return {
      topicsStarted,
      topicsCoveredThisWeek,
      totalAnswers,
      accuracy,
      currentStreak: effectiveStreak({
        currentStreak: userStats?.currentStreak ?? 0,
        lastActiveDate: userStats?.lastActiveDate ?? null,
        today,
      }),
      longestStreak: userStats?.longestStreak ?? 0,
      level: userStats?.level ?? 1,
      xp: userStats?.xp ?? 0,
      topicMastery,
      calibrationThreshold: CALIBRATION_THRESHOLD,
      recentEarned,
      nextClosest,
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

  weeklyPercentile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);

    const rows = await ctx.db.$queryRaw<{ userId: string; count: bigint }[]>`
      SELECT "userId", COUNT(*)::bigint AS count
      FROM "question_attempts"
      WHERE "answeredAt" > ${weekAgo}
      GROUP BY "userId";
    `;

    const cohortSize = rows.length;
    if (cohortSize < 20) return null;

    const userRow = rows.find((r) => r.userId === userId);
    const userCount = userRow ? Number(userRow.count) : 0;

    const belowOrEqual = rows.filter((r) => Number(r.count) <= userCount).length;
    const percentile = Math.round((belowOrEqual / cohortSize) * 100);

    if (percentile < 50) return null;

    return { percentile, cohortSize };
  }),
});
