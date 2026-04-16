import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const topicRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) =>
    ctx.db.topic.findMany({
      where: {
        course: {
          userCourses: { some: { userId: ctx.session.user.id } },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ),
});