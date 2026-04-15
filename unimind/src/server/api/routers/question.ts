import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  computeTopicScore,
  INITIAL_TOPIC_SCORE,
} from "~/server/lib/scoring";

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
      return ctx.db.question.findMany({
        where: {
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

  answer: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        choiceIndex: z.number().int().min(0),
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
        },
      });
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      const isCorrect = input.choiceIndex === question.answerIndex;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const userTopic = await ctx.db.$transaction(async (tx) => {
        const existing = await tx.userTopic.findUnique({
          where: { userId_topicId: { userId, topicId: question.topicId } },
          select: { score: true, correctCount: true, totalCount: true },
        });

        const prevScore = existing?.score ?? INITIAL_TOPIC_SCORE;
        const score = computeTopicScore({ prevScore, isCorrect });
        const correctCount = (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0);
        const totalCount = (existing?.totalCount ?? 0) + 1;

        const topic = await tx.topic.findUnique({
          where: { id: question.topicId },
          select: { name: true },
        });

        const updated = await tx.userTopic.upsert({
          where: { userId_topicId: { userId, topicId: question.topicId } },
          create: {
            userId,
            topicId: question.topicId,
            topicName: topic?.name ?? "Untitled",
            score,
            correctCount,
            totalCount,
            lastAnsweredAt: new Date(),
          },
          update: {
            score,
            correctCount,
            totalCount,
            lastAnsweredAt: new Date(),
          },
        });

        await tx.userStats.upsert({
          where: { userId },
          create: {
            userId,
            totalQuestionsAnswered: 1,
            totalCorrectAnswers: isCorrect ? 1 : 0,
            totalTimeSpent: input.timeSpentMs,
            lastActiveDate: today,
          },
          update: {
            totalQuestionsAnswered: { increment: 1 },
            totalCorrectAnswers: { increment: isCorrect ? 1 : 0 },
            totalTimeSpent: { increment: input.timeSpentMs },
            lastActiveDate: today,
          },
        });

        return updated;
      });

      return {
        isCorrect,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        userTopic,
      };
    }),
});
