import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Card, type Grade } from "ts-fsrs";
import {
  applyAnswer,
  applyMastery,
  pickNextQuestionId,
} from "~/server/lib/scoring";
import {
  xpForAnswer,
  levelForXp,
  updateStreak,
  evaluateAchievement,
  ALL_ACHIEVEMENT_CODES,
  type AchievementContext,
} from "~/server/lib/gamification";

export const questionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          topicId: z.string().optional(),
          difficulty: z.number().int().min(1).max(3).optional(),
          search: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const { topicId, difficulty, search, limit = 50 } = input ?? {};
      const trimmed = search?.trim();
      const userId = ctx.session.user.id;
      return ctx.db.question.findMany({
        where: {
          topic: {
            course: {
              userCourses: { some: { userId } },
            },
          },
          ...(topicId ? { topicId } : {}),
          ...(difficulty ? { difficulty } : {}),
          ...(trimmed
            ? {
                OR: [
                  { question: { contains: trimmed, mode: "insensitive" } },
                  { topic: { name: { contains: trimmed, mode: "insensitive" } } },
                  { subtopic: { name: { contains: trimmed, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          question: true,
          choices: true,
          answerIndex: true,
          explanation: true,
          difficulty: true,
          topic: { select: { id: true, name: true, course: { select: { name: true } } } },
          subtopic: { select: { id: true, name: true } },
        },
      });
    }),

  forMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const questionId = await pickNextQuestionId(ctx.db, userId);
    if (!questionId) return null;

    return ctx.db.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        question: true,
        choices: true,
        answerIndex: true,
        explanation: true,
        difficulty: true,
        topic: { select: { id: true, name: true, course: { select: { name: true } } } },
        subtopic: { select: { id: true, name: true } },
      },
    });
  }),

  nextForPaywall: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const questionId = await pickNextQuestionId(ctx.db, userId);
    if (!questionId) return null;

    // Paywall response shape: NO answerIndex, NO explanation pre-answer.
    return ctx.db.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        question: true,
        choices: true,
        difficulty: true,
        topic: { select: { id: true, name: true, course: { select: { name: true } } } },
        subtopic: { select: { id: true, name: true } },
      },
    });
  }),

  answer: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        choiceIndex: z.number().int().min(0),
        rating: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
        ]),
        source: z.enum(["paywall", "in_app"]),
        timeSpentMs: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const question = await ctx.db.question.findUnique({
        where: { id: input.questionId },
        select: {
          id: true,
          topicId: true,
          answerIndex: true,
          explanation: true,
          difficulty: true,
          topic: { select: { name: true } },
        },
      });
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      const isCorrect = input.choiceIndex === question.answerIndex;
      const now = new Date();
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);

      const result = await ctx.db.$transaction(async (tx) => {
        // 1. Load existing UserQuestion (or null = unseen).
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

        // 2. Run scheduler.
        const { card } = applyAnswer({
          prevCard,
          rating: input.rating as Grade,
          now,
        });

        // 3. Upsert UserQuestion with new Card state.
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

        // 4. Append QuestionAttempt audit row.
        await tx.questionAttempt.create({
          data: {
            userId,
            questionId: question.id,
            topicId: question.topicId,
            isCorrect,
            rating: input.rating,
            timeSpentMs: input.timeSpentMs,
            source: input.source,
            answeredAt: now,
          },
        });

        // 5. Update UserTopic mastery (EMA).
        const existingUt = await tx.userTopic.findUnique({
          where: { userId_topicId: { userId, topicId: question.topicId } },
          select: { masteryScore: true, masteryUpdatedAt: true, correctCount: true, totalCount: true },
        });
        const prevScore = existingUt?.masteryScore ?? 50;
        const prevUpdatedAt = existingUt?.masteryUpdatedAt ?? now;
        const { masteryScore, masteryUpdatedAt } = applyMastery({
          prevScore,
          prevUpdatedAt,
          isCorrect,
          now,
        });
        const correctCount = (existingUt?.correctCount ?? 0) + (isCorrect ? 1 : 0);
        const totalCount = (existingUt?.totalCount ?? 0) + 1;

        const userTopic = await tx.userTopic.upsert({
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

        // 6. Compute XP / level / streak from the existing UserStats row.
        const existingStats = await tx.userStats.findUnique({
          where: { userId },
          select: {
            xp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            lastActiveDate: true,
          },
        });

        const xpDelta = xpForAnswer({
          isCorrect,
          difficulty: question.difficulty,
        });
        const newXp = (existingStats?.xp ?? 0) + xpDelta;
        const newLevel = levelForXp(newXp);
        const leveledUp = newLevel > (existingStats?.level ?? 1);

        const streak = updateStreak({
          currentStreak: existingStats?.currentStreak ?? 0,
          longestStreak: existingStats?.longestStreak ?? 0,
          lastActiveDate: existingStats?.lastActiveDate ?? null,
          isCorrect,
          today,
        });

        await tx.userStats.upsert({
          where: { userId },
          create: {
            userId,
            totalQuestionsAnswered: 1,
            totalCorrectAnswers: isCorrect ? 1 : 0,
            totalTimeSpent: input.timeSpentMs,
            xp: xpDelta,
            level: levelForXp(xpDelta),
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastActiveDate: streak.lastActiveDate,
          },
          update: {
            totalQuestionsAnswered: { increment: 1 },
            totalCorrectAnswers: { increment: isCorrect ? 1 : 0 },
            totalTimeSpent: { increment: input.timeSpentMs },
            xp: newXp,
            level: newLevel,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastActiveDate: streak.lastActiveDate,
          },
        });

        // 7. Achievement evaluation. Build a post-answer context snapshot,
        // evaluate every registered predicate, and insert UserAchievement rows
        // for previously-unearned codes. Earned XP rewards are summed and
        // applied in a single stats patch below.
        const [
          topicAggregates,
          distinctTopicsCount,
          distinctCoursesCount,
          totalAnswersAgg,
          alreadyEarned,
        ] = await Promise.all([
          tx.userTopic.findMany({
            where: { userId },
            select: { masteryScore: true },
          }),
          tx.userTopic.count({ where: { userId } }),
          tx.userCourse.count({ where: { userId } }),
          tx.userStats.findUnique({
            where: { userId },
            select: { totalCorrectAnswers: true, totalQuestionsAnswered: true },
          }),
          tx.userAchievement.findMany({
            where: { userId },
            select: { achievement: { select: { code: true } } },
          }),
        ]);

        const ctxForAchievements: AchievementContext = {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          totalCorrectAnswers: totalAnswersAgg?.totalCorrectAnswers ?? 0,
          totalQuestionsAnswered: totalAnswersAgg?.totalQuestionsAnswered ?? 0,
          level: newLevel,
          topicsWithMastery70: topicAggregates.filter((t) => t.masteryScore >= 70).length,
          topicsWithMastery85: topicAggregates.filter((t) => t.masteryScore >= 85).length,
          distinctTopicsPracticed: distinctTopicsCount,
          distinctCoursesPracticed: distinctCoursesCount,
          justAnsweredDifficulty: question.difficulty,
          justAnsweredCorrectly: isCorrect,
          hasAnsweredAnyQuestion: (totalAnswersAgg?.totalQuestionsAnswered ?? 0) > 0,
        };

        const earnedCodes = new Set(alreadyEarned.map((r) => r.achievement.code));
        const newlyEarnedCodes: string[] = [];
        let bonusXp = 0;

        for (const code of ALL_ACHIEVEMENT_CODES) {
          if (earnedCodes.has(code)) continue;
          if (!evaluateAchievement(code, ctxForAchievements)) continue;
          const row = await tx.achievement.findUnique({
            where: { code },
            select: { id: true, xpReward: true },
          });
          if (!row) continue;
          await tx.userAchievement.create({
            data: { userId, achievementId: row.id },
          });
          newlyEarnedCodes.push(code);
          bonusXp += row.xpReward;
        }

        let finalXp = newXp;
        let finalLevel = newLevel;
        let finalLeveledUp = leveledUp;
        if (bonusXp > 0) {
          finalXp = newXp + bonusXp;
          finalLevel = levelForXp(finalXp);
          finalLeveledUp = finalLevel > (existingStats?.level ?? 1);
          await tx.userStats.update({
            where: { userId },
            data: { xp: finalXp, level: finalLevel },
          });
        }

        return {
          userTopic,
          nextDue: card.due,
          xpDelta: xpDelta + bonusXp,
          newXp: finalXp,
          newLevel: finalLevel,
          leveledUp: finalLeveledUp,
          streakExtended: streak.streakExtended,
          streakLost: streak.streakLost,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          newlyEarnedCodes,
        };
      });

      return {
        isCorrect,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        userTopic: result.userTopic,
        nextDue: result.nextDue,
        xpDelta: result.xpDelta,
        newXp: result.newXp,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp,
        streakExtended: result.streakExtended,
        streakLost: result.streakLost,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        newlyEarnedCodes: result.newlyEarnedCodes,
      };
    }),
});
