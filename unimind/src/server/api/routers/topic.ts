import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";


export const topicRouter = createTRPCRouter({
    getAll: publicProcedure.query( async ({ ctx }) => {
        return await ctx.db.userTopic.findMany({
            where: {
                userId: ctx.session?.user.id
            }
        });
    })
});