import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(["bug", "suggestion", "general"]),
        message: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.feedback.create({
        data: {
          userId: ctx.session.user.id,
          type: input.type,
          message: input.message,
        },
      });
    }),
});
