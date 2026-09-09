import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { lockUser } from "~/server/lib/user-lock";

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
      // Takes the same per-user lock as question.answer so an in-flight answer
      // cannot re-create per-course state after it has been wiped here.
      await ctx.db.$transaction(
        async (tx) => {
          await lockUser(tx, userId);
          await tx.questionAttempt.deleteMany({
            where: { userId, topic: { courseId } },
          });
          await tx.userQuestion.deleteMany({
            where: { userId, question: { topic: { courseId } } },
          });
          await tx.userTopic.deleteMany({
            where: { userId, topic: { courseId } },
          });
          await tx.userCourse.delete({
            where: { userId_courseId: { userId, courseId } },
          });
        },
        {
          // Remote pooler adds latency; default 5000ms is tight.
          maxWait: 5_000,
          timeout: 15_000,
        },
      );

      return { ok: true };
    }),

  listMine: protectedProcedure.query(({ ctx }) =>
    ctx.db.userCourse.findMany({
      where: { userId: ctx.session.user.id },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
    }),
  ),
});
