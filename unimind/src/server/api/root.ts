import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { topicRouter } from "./routers/topic";
import { questionRouter } from "./routers/question";
import { assessmentRouter } from "./routers/assessment";
import { courseRouter } from "./routers/course";
import { userRouter } from "./routers/user";
import { adminRouter } from "./routers/admin";
import { feedbackRouter } from "./routers/feedback";

export const appRouter = createTRPCRouter({
  user: userRouter,
  assessment: assessmentRouter,
  course: courseRouter,
  topic: topicRouter,
  question: questionRouter,
  admin: adminRouter,
  feedback: feedbackRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
