import type { Prisma, PrismaClient } from "../../../../generated/prisma";

/**
 * Best-effort analytics event writer. NEVER throws — errors are swallowed
 * and logged. Called OUTSIDE the question.answer $transaction so that
 * analytics failure cannot fail a user's answer.
 */
export async function logAnalyticsEvent(
  db: PrismaClient,
  args: {
    userId: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        userId: args.userId,
        eventType: args.eventType,
        payload: (args.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.warn("[analytics] failed to write event", args.eventType, err);
  }
}

export type AnalyticsEventInput = {
  userId: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
};

/**
 * Batched variant of `logAnalyticsEvent`: writes all events in ONE
 * `createMany` round trip. NEVER throws. Callers should `await` this before
 * returning a response — on serverless the function is frozen right after
 * the response is sent, so fire-and-forget writes are frequently lost.
 */
export async function logAnalyticsEvents(
  db: PrismaClient,
  events: AnalyticsEventInput[],
): Promise<void> {
  if (events.length === 0) return;
  try {
    await db.analyticsEvent.createMany({
      data: events.map((e) => ({
        userId: e.userId,
        eventType: e.eventType,
        payload: (e.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    });
  } catch (err) {
    console.warn(
      "[analytics] failed to write events",
      events.map((e) => e.eventType),
      err,
    );
  }
}

export const ANALYTICS_EVENTS = {
  PAYWALL_SHOWN: "paywall_shown",
  PAYWALL_ANSWERED: "paywall_answered",
  STREAK_EXTENDED: "streak_extended",
  STREAK_LOST: "streak_lost",
  LEVEL_UP: "level_up",
  ACHIEVEMENT_EARNED: "achievement_earned",
  PERCENTILE_SHOWN: "percentile_shown",
} as const;
