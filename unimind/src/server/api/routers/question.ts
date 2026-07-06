import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Card, type Grade } from "ts-fsrs";
import {
  applyAnswer,
  applyMastery,
  pickNextQuestionId,
} from "~/server/lib/scoring";
import { shuffleChoices } from "~/server/lib/shuffle";

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
                  {
                    topic: { name: { contains: trimmed, mode: "insensitive" } },
                  },
                  {
                    subtopic: {
                      name: { contains: trimmed, mode: "insensitive" },
                    },
                  },
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
          topic: {
            select: {
              id: true,
              name: true,
              course: { select: { name: true } },
            },
          },
          subtopic: { select: { id: true, name: true } },
        },
      });
    }),

  forMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const questionId = await pickNextQuestionId(ctx.db, userId);
    if (!questionId) return null;

    const q = await ctx.db.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        question: true,
        choices: true,
        answerIndex: true,
        explanation: true,
        difficulty: true,
        topic: {
          select: { id: true, name: true, course: { select: { name: true } } },
        },
        subtopic: { select: { id: true, name: true } },
      },
    });
    if (!q) return null;
    const { choices, answerIndex } = shuffleChoices(q.id, q.choices, q.answerIndex);
    return { ...q, choices, answerIndex };
  }),

  nextForPaywall: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const questionId = await pickNextQuestionId(ctx.db, userId);
    if (!questionId) return null;

    // Paywall response shape: NO answerIndex, NO explanation pre-answer.
    const q = await ctx.db.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        question: true,
        choices: true,
        answerIndex: true,
        difficulty: true,
        topic: {
          select: { id: true, name: true, course: { select: { name: true } } },
        },
        subtopic: { select: { id: true, name: true } },
      },
    });
    if (!q) return null;
    const { choices } = shuffleChoices(q.id, q.choices, q.answerIndex);
    const { answerIndex: _removed, ...rest } = { ...q, choices };
    return rest;
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
          subtopicId: true,
          choices: true,
          answerIndex: true,
          explanation: true,
          topic: { select: { name: true } },
          difficulty: true,
        },
      });
      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
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
            subtopicId: question.subtopicId,
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
        const correctCount =
          (existingUt?.correctCount ?? 0) + (isCorrect ? 1 : 0);
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

        if (!lastActiveDate) {
          newStreak = 1;
        } else if (today.getTime() - lastActiveDate.getTime() === 86400000) {
          newStreak += 1;
        } else if (today.getTime() - lastActiveDate.getTime() > 86400000) {
          newStreak = 1;
        }

        if (newStreak > longestStreak) {
          newLongestStreak = newStreak;
        }

        if (isCorrect) {
          if (question.difficulty === 1) {
            xp += 16;
          } else if (question.difficulty === 2) {
            xp += 24;
          } else if (question.difficulty === 3) {
            xp += 40;
          }
        } else if (!isCorrect) {
          if (question.difficulty === 1) {
            xp += 1;
          } else if (question.difficulty === 2) {
            xp += 2;
          } else if (question.difficulty === 3) {
            xp += 4;
          }
        }

        if (newStreak % 10 === 0 && newStreak !== 0) {
          xp += 100;
        }

        if (prevScore < 95 && masteryScore >= 95) {
          xp += 250;
        }

        level = Math.floor(Math.sqrt(xp / 50));

        // 6. Update UserStats (unchanged from current logic).
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
            xp: xp,
            level: level,
          },
        });

        return { userTopic, nextDue: card.due };
      });

      return {
        isCorrect,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        userTopic: result.userTopic,
        nextDue: result.nextDue,
      };
    }),
});
