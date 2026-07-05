import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { readMastery } from "~/server/lib/scoring";
import { env } from "~/env";

const CALIBRATION_THRESHOLD = 10;

export const userRouter = createTRPCRouter({
  count: publicProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.user.count();
    return { count };
  }),

  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [userStats, userTopics, attemptedTopics] = await Promise.all([
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
      ctx.db.topic.findMany({
        where: { userTopics: { some: { userId } } },
        select: { courseId: true },
      }),
    ]);

    const now = new Date();
    let totalAnswers = 0;
    let scoreSum = 0;
    for (const t of userTopics) {
      totalAnswers += t.totalCount;
      scoreSum += readMastery({
        score: t.masteryScore,
        updatedAt: t.masteryUpdatedAt,
        now,
      });
    }
    const topicsCovered = userTopics.length;
    const coursesCovered = new Set(attemptedTopics.map((t) => t.courseId)).size;

    const accuracy =
      totalAnswers < CALIBRATION_THRESHOLD || topicsCovered === 0
        ? null
        : Math.round(scoreSum / topicsCovered);

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

    return {
      topicsCovered,
      coursesCovered,
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

  progressStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [userStats, userTopics, subtopicAttempts, topicsWithSubtopics] =
      await Promise.all([
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
        ctx.db.questionAttempt.findMany({
          where: { userId, subtopicId: { not: null } },
          select: { subtopicId: true, isCorrect: true },
        }),
        ctx.db.topic.findMany({
          where: { course: { userCourses: { some: { userId } } } },
          select: {
            id: true,
            courseId: true,
            course: { select: { name: true } },
            subTopics: { select: { id: true, name: true } },
          },
        }),
      ]);

    // Aggregate attempt counts per subtopic
    const subtopicStats = new Map<string, { correct: number; total: number }>();
    for (const a of subtopicAttempts) {
      if (!a.subtopicId) continue;
      const s = subtopicStats.get(a.subtopicId) ?? { correct: 0, total: 0 };
      subtopicStats.set(a.subtopicId, {
        correct: s.correct + (a.isCorrect ? 1 : 0),
        total: s.total + 1,
      });
    }

    // Map topicId -> subtopics with stats (only attempted ones)
    const topicSubtopics = new Map<
      string,
      { id: string; name: string; correctCount: number; totalCount: number }[]
    >();
    const topicCourseInfo = new Map<string, { courseId: string; courseName: string }>();
    for (const t of topicsWithSubtopics) {
      topicSubtopics.set(
        t.id,
        t.subTopics
          .map((st) => {
            const s = subtopicStats.get(st.id) ?? { correct: 0, total: 0 };
            return { id: st.id, name: st.name, correctCount: s.correct, totalCount: s.total };
          })
          .filter((st) => st.totalCount > 0),
      );
      topicCourseInfo.set(t.id, { courseId: t.courseId, courseName: t.course.name });
    }

    const now = new Date();
    const topics = userTopics
      .map((t) => {
        const courseInfo = topicCourseInfo.get(t.topicId);
        return {
          topicId: t.topicId,
          name: t.topicName,
          courseId: courseInfo?.courseId ?? "",
          courseName: courseInfo?.courseName ?? "",
          score: Math.round(
            readMastery({
              score: t.masteryScore,
              updatedAt: t.masteryUpdatedAt,
              now,
            }),
          ),
          correctCount: t.correctCount,
          totalCount: t.totalCount,
          lastAnsweredAt: t.lastAnsweredAt,
          subtopics: topicSubtopics.get(t.topicId) ?? [],
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      currentStreak: userStats?.currentStreak ?? 0,
      longestStreak: userStats?.longestStreak ?? 0,
      level: userStats?.level ?? 1,
      xp: userStats?.xp ?? 0,
      topics,
    };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { name: true },
    });
    return {
      name: user?.name ?? "",
      email: ctx.session.user.email ?? "",
    };
  }),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name },
      });
    }),
  
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
  const userId = ctx.session.user.id;

  await ctx.db.user.delete({ where: { id: userId } });

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  await admin.auth.admin.deleteUser(userId);
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
