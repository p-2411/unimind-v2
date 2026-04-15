import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";


export const courseRouter = createTRPCRouter({
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
        update: { isActive: true, archivedAt: null },
      }),
    ),

  listMine: protectedProcedure.query(({ ctx }) =>
    ctx.db.userCourse.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
    }),
  ),
});