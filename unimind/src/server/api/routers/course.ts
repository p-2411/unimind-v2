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
