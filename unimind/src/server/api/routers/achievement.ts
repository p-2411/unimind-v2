import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getAchievementProgress,
  loadAchievementContext,
} from "~/server/lib/gamification";

export const achievementRouter = createTRPCRouter({
  listForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Context-only predicates cannot be "close" — the snapshot's transient
    // fields default to all-or-nothing.
    const [allAchievements, earnedRows, snapshot] = await Promise.all([
      ctx.db.achievement.findMany({
        orderBy: [{ category: "asc" }, { tier: "asc" }, { code: "asc" }],
      }),
      ctx.db.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, earnedAt: true },
      }),
      loadAchievementContext(ctx.db, userId, { now: new Date() }),
    ]);

    const earnedById = new Map(
      earnedRows.map((r) => [r.achievementId, r.earnedAt]),
    );

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
