import type { Prisma, PrismaClient } from "../../../../generated/prisma";

import { readMastery } from "~/server/lib/scoring";
import { type AchievementContext } from "./achievements";
import { effectiveStreak } from "./streak";

export type StatsSnapshot = {
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  totalCorrectAnswers: number;
  totalQuestionsAnswered: number;
};

/**
 * Single source of truth for the `AchievementContext` used by unlock
 * evaluation (question.answer) and progress display (dashboard, achievements
 * page). Mastery thresholds use the decayed `readMastery` value the dashboard
 * shows, "courses practiced" is derived from UserTopic rows (not enrolments),
 * and the streak is zeroed once it has lapsed.
 *
 * Pass `opts.stats` when the caller already holds fresh values (e.g. inside
 * the answer transaction, right after the UserStats write).
 */
export async function loadAchievementContext(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  opts: {
    now: Date;
    stats?: StatsSnapshot | null;
    transient?: { justAnsweredDifficulty: number; justAnsweredCorrectly: boolean };
  },
): Promise<AchievementContext> {
  const { now } = opts;
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const [stats, rows] = await Promise.all([
    opts.stats !== undefined
      ? Promise.resolve(opts.stats)
      : db.userStats.findUnique({
          where: { userId },
          select: {
            level: true,
            currentStreak: true,
            longestStreak: true,
            lastActiveDate: true,
            totalCorrectAnswers: true,
            totalQuestionsAnswered: true,
          },
        }),
    db.userTopic.findMany({
      where: { userId },
      select: {
        masteryScore: true,
        masteryUpdatedAt: true,
        topic: { select: { courseId: true } },
      },
    }),
  ]);

  let topicsWithMastery70 = 0;
  let topicsWithMastery85 = 0;
  for (const r of rows) {
    const score = readMastery({
      score: r.masteryScore,
      updatedAt: r.masteryUpdatedAt,
      now,
    });
    if (score >= 70) topicsWithMastery70 += 1;
    if (score >= 85) topicsWithMastery85 += 1;
  }

  const totalQuestionsAnswered = stats?.totalQuestionsAnswered ?? 0;

  return {
    currentStreak: effectiveStreak({
      currentStreak: stats?.currentStreak ?? 0,
      lastActiveDate: stats?.lastActiveDate ?? null,
      today,
    }),
    longestStreak: stats?.longestStreak ?? 0,
    totalCorrectAnswers: stats?.totalCorrectAnswers ?? 0,
    totalQuestionsAnswered,
    level: stats?.level ?? 1,
    topicsWithMastery70,
    topicsWithMastery85,
    distinctTopicsPracticed: rows.length,
    distinctCoursesPracticed: new Set(rows.map((r) => r.topic.courseId)).size,
    justAnsweredDifficulty: opts.transient?.justAnsweredDifficulty ?? 0,
    justAnsweredCorrectly: opts.transient?.justAnsweredCorrectly ?? false,
    hasAnsweredAnyQuestion: totalQuestionsAnswered > 0,
  };
}
