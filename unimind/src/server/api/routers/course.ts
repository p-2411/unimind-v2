import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const courseRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.course.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
        startDate: true,
        flexWeeks: true,
      },
    }),
  ),

  enroll: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.userCourse.upsert({
        where: {
          userId_courseId: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        },
        create: { userId: ctx.session.user.id, courseId: input.courseId },
        update: {},
      }),
    ),

  unenroll: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { courseId } = input;

      // Hard reset: wipe all per-user state for this course in one transaction.
      await ctx.db.$transaction([
        ctx.db.questionAttempt.deleteMany({
          where: { userId, topic: { courseId } },
        }),
        ctx.db.userQuestion.deleteMany({
          where: { userId, question: { topic: { courseId } } },
        }),
        ctx.db.userTopic.deleteMany({
          where: { userId, topic: { courseId } },
        }),
        ctx.db.userCourse.delete({
          where: { userId_courseId: { userId, courseId } },
        }),
      ]);

      return { ok: true };
    }),

  listMine: protectedProcedure.query(({ ctx }) =>
    ctx.db.userCourse.findMany({
      where: { userId: ctx.session.user.id },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
    }),
  ),

  setWeekOverride: protectedProcedure
    .input(z.object({ courseId: z.string(), week: z.number().int().min(1).nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.db.userCourse.update({
        where: {
          userId_courseId: {
            userId: ctx.session.user.id,
            courseId: input.courseId,
          },
        },
        data: { currentWeekOverride: input.week },
      }),
    ),
});
