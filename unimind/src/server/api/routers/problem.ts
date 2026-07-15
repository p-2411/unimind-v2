import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const problemRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        topicId: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        type: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const problems = await ctx.db.problem.findMany({
        where: {
          course: {
            userCourses: { some: { userId } },
          },
          ...(input?.topicId ? { topicId: input.topicId } : {}),
          ...(input?.difficulty ? { difficulty: input.difficulty } : {}),
          ...(input?.type ? { type: input.type } : {}),
        },
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          type: true,
          courseId: true,
          topicId: true,
          topic: { select: { name: true } },
          course: { select: { name: true } },
          attempts: {
            where: { userId },
            select: { selfRated: true, completedAt: true },
          },
        },
        orderBy: [
          { difficulty: "asc" },
          { createdAt: "asc" },
        ],
      });

      return problems.map((p) => ({
        ...p,
        attempt: p.attempts[0] ?? null,
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const problem = await ctx.db.problem.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          topic: { select: { name: true } },
          course: { select: { name: true } },
          attempts: {
            where: { userId },
            select: { id: true, selfRated: true, startedAt: true, completedAt: true },
          },
        },
      });

      return {
        ...problem,
        attempt: problem.attempts[0] ?? null,
      };
    }),

  startAttempt: protectedProcedure
    .input(z.object({ problemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.problemAttempt.upsert({
        where: { userId_problemId: { userId, problemId: input.problemId } },
        create: { userId, problemId: input.problemId },
        update: {},
      });
    }),

  rate: protectedProcedure
    .input(z.object({
      problemId: z.string(),
      selfRated: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.problemAttempt.upsert({
        where: { userId_problemId: { userId, problemId: input.problemId } },
        create: {
          userId,
          problemId: input.problemId,
          selfRated: input.selfRated,
          completedAt: new Date(),
        },
        update: {
          selfRated: input.selfRated,
          completedAt: new Date(),
        },
      });
    }),
});
