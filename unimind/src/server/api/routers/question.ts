import { createHash } from "node:crypto";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import superjson from "superjson";

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
  loadAchievementContext,
  logAnalyticsEvents,
  ANALYTICS_EVENTS,
  type AnalyticsEventInput,
} from "~/server/lib/gamification";
import { lockUser } from "~/server/lib/user-lock";

const answerRequestSchema = z.object({
  questionId: z.string(),
  choiceIndex: z.number().int().min(0),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  source: z.enum(["paywall", "in_app"]),
  timeSpentMs: z.number().int().min(0).max(2_147_483_647).default(0),
});

const answerInputSchema = answerRequestSchema.extend({
  attemptId: z.string().uuid(),
});

const earnedAchievementSchema = z.object({
  code: z.string(),
  name: z.string(),
  xpReward: z.number().int(),
});

const answerResponseSchema = z.object({
  isCorrect: z.boolean(),
  answerIndex: z.number().int(),
  explanation: z.string().nullable(),
  userTopic: z.object({
    id: z.string(),
    topicName: z.string(),
    userId: z.string().uuid(),
    topicId: z.string(),
    masteryScore: z.number(),
    masteryUpdatedAt: z.date(),
    correctCount: z.number().int(),
    totalCount: z.number().int(),
    lastAnsweredAt: z.date().nullable(),
    updatedAt: z.date(),
  }),
  nextDue: z.date(),
  xpDelta: z.number().int(),
  newXp: z.number().int(),
  newLevel: z.number().int(),
  leveledUp: z.boolean(),
  streakExtended: z.boolean(),
  streakLost: z.boolean(),
  currentStreak: z.number().int(),
  longestStreak: z.number().int(),
  newlyEarnedCodes: z.array(z.string()),
  newlyEarned: z.array(earnedAchievementSchema),
});

type AnswerRequest = z.infer<typeof answerRequestSchema>;
type AnswerResponse = z.infer<typeof answerResponseSchema>;

function toAnswerRequest(input: z.infer<typeof answerInputSchema>): AnswerRequest {
  return {
    questionId: input.questionId,
    choiceIndex: input.choiceIndex,
    rating: input.rating,
    source: input.source,
    timeSpentMs: input.timeSpentMs,
  };
}

function fingerprintAnswerRequest(input: AnswerRequest): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function deserializeAnswerResponse(payload: string): AnswerResponse {
  return answerResponseSchema.parse(superjson.parse<unknown>(payload));
}

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
    .input(answerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const answerRequest = toAnswerRequest(input);
      const requestJson = JSON.stringify(answerRequest);
      const payloadFingerprint = fingerprintAnswerRequest(answerRequest);

      const transactionResult = await ctx.db.$transaction(async (tx) => {
        // Serialise this user's answer transactions: XP/level/streak and
        // achievement unlocks are read-then-write, so concurrent answers would
        // clobber each other or double-insert achievements (P2002).
        await lockUser(tx, userId);

        const receipt = await tx.questionAnswerReceipt.findUnique({
          where: {
            userId_attemptId: { userId, attemptId: input.attemptId },
          },
          select: {
            payloadFingerprint: true,
            requestPayload: true,
            responsePayload: true,
          },
        });
        if (receipt) {
          const storedRequest = answerRequestSchema.safeParse(
            receipt.requestPayload,
          );
          const samePayload =
            receipt.payloadFingerprint === payloadFingerprint &&
            storedRequest.success &&
            JSON.stringify(storedRequest.data) === requestJson;
          if (!samePayload) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "attemptId has already been used with a different answer payload",
            });
          }
          return {
            kind: "replay" as const,
            response: deserializeAnswerResponse(receipt.responsePayload),
          };
        }

        // clock_timestamp(), unlike transaction_timestamp(), is evaluated
        // after the lock wait. This keeps scheduler/mastery timestamps ordered
        // by actual per-user processing order rather than request arrival.
        const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`
          SELECT clock_timestamp() AS now
        `;
        if (!clock) throw new Error("Database clock query returned no row");
        const now = clock.now;
        const today = new Date(now);
        today.setUTCHours(0, 0, 0, 0);

        const question = await tx.question.findUnique({
          where: { id: input.questionId },
          select: {
            id: true,
            topicId: true,
            choices: true,
            answerIndex: true,
            explanation: true,
            difficulty: true,
            topic: { select: { name: true, courseId: true } },
          },
        });
        if (!question) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
        }

        const isCorrect = input.choiceIndex === question.answerIndex;
        const achievementCatalog = await tx.achievement.findMany({
          where: { code: { in: [...ALL_ACHIEVEMENT_CODES] } },
          select: { id: true, code: true, name: true, xpReward: true },
        });
        const catalogByCode = new Map(
          achievementCatalog.map((achievement) => [
            achievement.code,
            {
              id: achievement.id,
              name: achievement.name,
              xpReward: achievement.xpReward,
            },
          ]),
        );

        // Enrollment check runs under the lock so a concurrent unenroll (which
        // takes the same lock) cannot slip between the check and the writes
        // below. Throwing here rolls the transaction back.
        const enrolled = await tx.userCourse.findUnique({
          where: {
            userId_courseId: { userId, courseId: question.topic.courseId },
          },
          select: { userId: true },
        });
        if (!enrolled) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Question is not in one of your enrolled courses",
          });
        }

        if (input.choiceIndex >= question.choices.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "choiceIndex must identify an available choice",
          });
        }

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

        const streak = updateStreak({
          currentStreak: existingStats?.currentStreak ?? 0,
          longestStreak: existingStats?.longestStreak ?? 0,
          lastActiveDate: existingStats?.lastActiveDate ?? null,
          today,
        });

        const savedStats = await tx.userStats.upsert({
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

        // 7. Achievement evaluation. Load the shared post-answer context
        // snapshot (with the just-written stats), evaluate every registered
        // predicate, and insert UserAchievement rows for previously-unearned
        // codes. Earned XP rewards are summed and applied in a single stats
        // patch below.
        const [baseCtx, alreadyEarned] = await Promise.all([
          loadAchievementContext(tx, userId, {
            now,
            stats: {
              level: newLevel,
              currentStreak: streak.currentStreak,
              longestStreak: streak.longestStreak,
              lastActiveDate: streak.lastActiveDate,
              totalCorrectAnswers: savedStats.totalCorrectAnswers,
              totalQuestionsAnswered: savedStats.totalQuestionsAnswered,
            },
            transient: {
              justAnsweredDifficulty: question.difficulty,
              justAnsweredCorrectly: isCorrect,
            },
          }),
          tx.userAchievement.findMany({
            where: { userId },
            select: { achievement: { select: { code: true } } },
          }),
        ]);

        const earnedCodes = new Set(alreadyEarned.map((r) => r.achievement.code));
        const newlyEarned: Array<{ code: string; name: string; xpReward: number }> = [];
        let bonusXp = 0;
        let finalXp = newXp;
        let finalLevel = newLevel;

        // Fixpoint: bonus XP from an unlock can cross a level boundary, which
        // can itself satisfy a level-based achievement (META_LEVEL_5). Re-run
        // with the patched level until a pass earns nothing. Every non-final
        // pass inserts at least one new code, so this is bounded by the
        // catalog size.
        let earnedThisPass: number;
        do {
          earnedThisPass = 0;
          const ctxForAchievements = { ...baseCtx, level: finalLevel };
          for (const code of ALL_ACHIEVEMENT_CODES) {
            if (earnedCodes.has(code)) continue;
            if (!evaluateAchievement(code, ctxForAchievements)) continue;
            const row = catalogByCode.get(code);
            if (!row) continue;
            await tx.userAchievement.create({
              data: { userId, achievementId: row.id },
            });
            earnedCodes.add(code);
            newlyEarned.push({ code, name: row.name, xpReward: row.xpReward });
            bonusXp += row.xpReward;
            earnedThisPass += 1;
          }
          finalXp = newXp + bonusXp;
          finalLevel = levelForXp(finalXp);
        } while (earnedThisPass > 0);
        const newlyEarnedCodes = newlyEarned.map((a) => a.code);

        const finalLeveledUp = finalLevel > (existingStats?.level ?? 1);
        if (bonusXp > 0) {
          await tx.userStats.update({
            where: { userId },
            data: { xp: finalXp, level: finalLevel },
          });
        }

        const response = answerResponseSchema.parse({
          isCorrect,
          answerIndex: question.answerIndex,
          explanation: question.explanation,
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
          newlyEarned,
        });

        await tx.questionAnswerReceipt.create({
          data: {
            userId,
            attemptId: input.attemptId,
            payloadFingerprint,
            requestPayload: answerRequest,
            responsePayload: superjson.stringify(response),
          },
        });

        return {
          kind: "initial" as const,
          response,
          difficulty: question.difficulty,
        };
      }, {
        // Remote pooler adds latency; default 5000ms is tight for this mutation.
        maxWait: 5_000,
        timeout: 15_000,
      });

      if (transactionResult.kind === "replay") {
        return transactionResult.response;
      }

      const { response } = transactionResult;
      // Best-effort analytics are emitted only by the transaction that first
      // commits the receipt. Replays return before reaching this write.
      const analyticsEvents: AnalyticsEventInput[] = [
        {
          userId,
          eventType: ANALYTICS_EVENTS.PAYWALL_ANSWERED,
          payload: {
            isCorrect: response.isCorrect,
            difficulty: transactionResult.difficulty,
            xpGranted: response.xpDelta,
            source: input.source,
          },
        },
      ];
      if (response.streakExtended) {
        analyticsEvents.push({
          userId,
          eventType: ANALYTICS_EVENTS.STREAK_EXTENDED,
          payload: { length: response.currentStreak },
        });
      }
      if (response.streakLost) {
        analyticsEvents.push({
          userId,
          eventType: ANALYTICS_EVENTS.STREAK_LOST,
          payload: { priorLongest: response.longestStreak },
        });
      }
      if (response.leveledUp) {
        analyticsEvents.push({
          userId,
          eventType: ANALYTICS_EVENTS.LEVEL_UP,
          payload: { toLevel: response.newLevel },
        });
      }
      for (const code of response.newlyEarnedCodes) {
        analyticsEvents.push({
          userId,
          eventType: ANALYTICS_EVENTS.ACHIEVEMENT_EARNED,
          payload: { code },
        });
      }
      await logAnalyticsEvents(ctx.db, analyticsEvents);

      return response;
    }),
});
