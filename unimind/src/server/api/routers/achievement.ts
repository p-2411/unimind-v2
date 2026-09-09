import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  evaluateAchievement,
  getAchievementProgress,
  type AchievementContext,
} from "~/server/lib/gamification";

export const achievementRouter = createTRPCRouter({
  listForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [allAchievements, earnedRows, stats, userTopics, distinctCourses] =
      await Promise.all([
        ctx.db.achievement.findMany({
          orderBy: [{ category: "asc" }, { tier: "asc" }, { code: "asc" }],
        }),
        ctx.db.userAchievement.findMany({
          where: { userId },
          select: { achievementId: true, earnedAt: true },
        }),
        ctx.db.userStats.findUnique({
          where: { userId },
          select: {
            xp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            totalCorrectAnswers: true,
            totalQuestionsAnswered: true,
          },
        }),
        ctx.db.userTopic.findMany({
          where: { userId },
          select: { masteryScore: true },
        }),
        ctx.db.userCourse.count({ where: { userId } }),
      ]);

    const earnedById = new Map(
      earnedRows.map((r) => [r.achievementId, r.earnedAt]),
    );

    const snapshot: AchievementContext = {
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      totalCorrectAnswers: stats?.totalCorrectAnswers ?? 0,
      totalQuestionsAnswered: stats?.totalQuestionsAnswered ?? 0,
      level: stats?.level ?? 1,
      topicsWithMastery70: userTopics.filter((t) => t.masteryScore >= 70).length,
      topicsWithMastery85: userTopics.filter((t) => t.masteryScore >= 85).length,
      distinctTopicsPracticed: userTopics.length,
      distinctCoursesPracticed: distinctCourses,
      // Context-only predicates cannot be "close" — treat as all-or-nothing.
      justAnsweredDifficulty: 0,
      justAnsweredCorrectly: false,
      hasAnsweredAnyQuestion: (stats?.totalQuestionsAnswered ?? 0) > 0,
    };

    const earned: Array<{
      achievement: (typeof allAchievements)[number];
      earnedAt: Date;
    }> = [];
    const locked: Array<{
      achievement: (typeof allAchievements)[number];
      progress: number | null;
    }> = [];

    for (const a of allAchievements) {
      const earnedAt = earnedById.get(a.id);
      if (earnedAt) {
        earned.push({ achievement: a, earnedAt });
      } else {
        locked.push({
          achievement: a,
          progress: getAchievementProgress(a.code, snapshot),
        });
      }
    }

    earned.sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());

    return {
      earned,
      locked,
      totalCount: allAchievements.length,
      xpFromAchievements: earned.reduce(
        (sum, e) => sum + (e.achievement.xpReward ?? 0),
        0,
      ),
    };
  }),
});
