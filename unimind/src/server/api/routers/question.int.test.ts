import { randomUUID } from "node:crypto";

import { createCaller } from "~/server/api/root";
import {
  cleanup,
  createFixture,
  db,
  makeCaller,
  utcToday,
  type Fixture,
} from "../../../../test/fixtures";

type Answer = {
  questionId: string;
  answerIndex: number;
};

const answerInput = (q: Answer, correct = true) => ({
  attemptId: randomUUID(),
  questionId: q.questionId,
  choiceIndex: correct ? q.answerIndex : (q.answerIndex + 1) % 4,
  rating: 3 as const,
  source: "in_app" as const,
});

const REWARDS: Record<string, number> = {
  META_FIRST_ANSWER: 10,
  META_HARD_ANSWER: 30,
  META_LEVEL_5: 100,
};

afterAll(async () => {
  await db.$disconnect();
});

describe("question.answer — happy path and repeat answer", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: [{ difficulty: 2 }],
      label: "happy",
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("enrolled user answering correctly writes attempt, stats, achievement and analytics", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;

    const res = await caller.question.answer(
      answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
    );

    expect(res.isCorrect).toBe(true);
    expect(res.newlyEarned).toEqual([
      { code: "META_FIRST_ANSWER", name: "First Step", xpReward: 10 },
    ]);
    expect(res.newlyEarnedCodes).toEqual(["META_FIRST_ANSWER"]);
    // 10 base XP (difficulty 2) + 10 META_FIRST_ANSWER reward.
    expect(res.xpDelta).toBe(20);
    expect(res.newXp).toBe(20);
    expect(res.currentStreak).toBe(1);

    const userId = fx.user.id;
    expect(await db.questionAttempt.count({ where: { userId } })).toBe(1);
    expect(
      await db.questionAttempt.findFirst({ where: { userId } }),
    ).toMatchObject({
      questionId: q.id,
      topicId: fx.topicId,
      isCorrect: true,
      rating: 3,
      source: "in_app",
    });
    expect(await db.userQuestion.count({ where: { userId } })).toBe(1);

    const stats = await db.userStats.findUniqueOrThrow({ where: { userId } });
    expect(stats).toMatchObject({
      xp: 20,
      level: 1,
      totalQuestionsAnswered: 1,
      totalCorrectAnswers: 1,
      currentStreak: 1,
      longestStreak: 1,
    });
    expect(stats.lastActiveDate?.getTime()).toBe(utcToday().getTime());

    const earned = await db.userAchievement.findMany({
      where: { userId },
      include: { achievement: { select: { code: true } } },
    });
    expect(earned).toHaveLength(1);
    expect(earned[0]!.achievement.code).toBe("META_FIRST_ANSWER");

    const events = await db.analyticsEvent.findMany({ where: { userId } });
    const types = events.map((e) => e.eventType);
    expect(types).toContain("paywall_answered");
    expect(types).toContain("achievement_earned");
    expect(
      events.find((e) => e.eventType === "achievement_earned")?.payload,
    ).toEqual({ code: "META_FIRST_ANSWER" });
    expect(
      events.find((e) => e.eventType === "paywall_answered")?.payload,
    ).toMatchObject({
      isCorrect: true,
      difficulty: 2,
      xpGranted: 20,
      source: "in_app",
    });
  });

  it("answering the same question again earns nothing new and appends a second attempt", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;

    const res = await caller.question.answer(
      answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
    );

    expect(res.isCorrect).toBe(true);
    expect(res.newlyEarned).toEqual([]);
    expect(res.newlyEarnedCodes).toEqual([]);
    expect(res.xpDelta).toBe(10);

    const userId = fx.user.id;
    expect(await db.questionAttempt.count({ where: { userId } })).toBe(2);
    expect(await db.userQuestion.count({ where: { userId } })).toBe(1);
    expect(await db.userAchievement.count({ where: { userId } })).toBe(1);
    expect(
      await db.userStats.findUniqueOrThrow({ where: { userId } }),
    ).toMatchObject({
      xp: 30,
      totalQuestionsAnswered: 2,
      totalCorrectAnswers: 2,
    });
  });
});

describe("question.answer — replay safety", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: [{ difficulty: 2 }],
      label: "replay",
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("returns the original dated response for concurrent and sequential retries with one set of effects", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;
    const input = answerInput(
      { questionId: q.id, answerIndex: q.answerIndex },
      true,
    );

    const concurrent = await Promise.all(
      Array.from({ length: 6 }, () => caller.question.answer(input)),
    );
    for (const response of concurrent) {
      expect(response).toEqual(concurrent[0]);
      expect(response.nextDue).toBeInstanceOf(Date);
      expect(response.userTopic.masteryUpdatedAt).toBeInstanceOf(Date);
      expect(response.userTopic.lastAnsweredAt).toBeInstanceOf(Date);
      expect(response.userTopic.updatedAt).toBeInstanceOf(Date);
    }

    const events = await db.analyticsEvent.findMany({
      where: { userId: fx.user.id },
    });
    expect(
      events.filter((event) => event.eventType === "paywall_answered"),
    ).toHaveLength(1);
    expect(
      events.filter((event) => event.eventType === "achievement_earned"),
    ).toHaveLength(1);
    expect(
      events.filter((event) => event.eventType === "streak_extended"),
    ).toHaveLength(1);
    const eventCount = events.length;
    const card = await db.userQuestion.findFirstOrThrow({
      where: { userId: fx.user.id },
    });
    expect(card.reps).toBe(1);
    expect(
      await db.userTopic.findFirstOrThrow({ where: { userId: fx.user.id } }),
    ).toMatchObject({ totalCount: 1, correctCount: 1 });
    expect(
      await db.userAchievement.count({ where: { userId: fx.user.id } }),
    ).toBe(1);
    const sequential = await caller.question.answer(input);
    expect(sequential).toEqual(concurrent[0]);

    expect(
      await db.questionAnswerReceipt.count({
        where: { userId: fx.user.id },
      }),
    ).toBe(1);
    expect(
      await db.questionAttempt.count({ where: { userId: fx.user.id } }),
    ).toBe(1);
    expect(
      await db.userStats.findUniqueOrThrow({ where: { userId: fx.user.id } }),
    ).toMatchObject({
      xp: concurrent[0]!.newXp,
      totalQuestionsAnswered: 1,
      totalCorrectAnswers: 1,
    });
    expect(
      await db.analyticsEvent.count({ where: { userId: fx.user.id } }),
    ).toBe(eventCount);
  });

  it("rejects a reused attemptId with a different payload", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;
    const original = answerInput(
      { questionId: q.id, answerIndex: q.answerIndex },
      true,
    );
    await caller.question.answer(original);

    const beforeAttempts = await db.questionAttempt.count({
      where: { userId: fx.user.id },
    });
    const beforeEvents = await db.analyticsEvent.count({
      where: { userId: fx.user.id },
    });
    for (const change of [
      { choiceIndex: (q.answerIndex + 1) % 4 },
      { questionId: "another-question" },
      { rating: 2 as const },
      { source: "paywall" as const },
      { timeSpentMs: 1 },
    ]) {
      await expect(
        caller.question.answer({ ...original, ...change }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect(
      await db.questionAttempt.count({ where: { userId: fx.user.id } }),
    ).toBe(beforeAttempts);
    expect(
      await db.analyticsEvent.count({ where: { userId: fx.user.id } }),
    ).toBe(beforeEvents);
  });

  it("allows a genuine repeat answer with a new attemptId", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;
    const before = await db.questionAttempt.count({
      where: { userId: fx.user.id },
    });

    await caller.question.answer(
      answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
    );

    expect(
      await db.questionAttempt.count({ where: { userId: fx.user.id } }),
    ).toBe(before + 1);
    expect(
      await db.questionAnswerReceipt.count({
        where: { userId: fx.user.id },
      }),
    ).toBe(3);
  });
});

describe("question.answer — input bounds", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({ questions: [{}], label: "bounds" });
    await db.question.update({
      where: { id: fx.questions[0]!.id },
      data: { choices: ["A", "B"] },
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it.each([
    { choiceIndex: -1 },
    { choiceIndex: 0.5 },
    { choiceIndex: 2 },
    { choiceIndex: 100 },
    { timeSpentMs: -1 },
    { timeSpentMs: 0.5 },
    { timeSpentMs: 2_147_483_648 },
  ])(
    "rejects invalid input %j without effects or a receipt",
    async (invalid) => {
      const q = fx.questions[0]!;
      await expect(
        makeCaller(fx.user).question.answer({
          ...answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
          ...invalid,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      const where = { userId: fx.user.id };
      expect(await db.questionAttempt.count({ where })).toBe(0);
      expect(await db.questionAnswerReceipt.count({ where })).toBe(0);
      expect(await db.userQuestion.count({ where })).toBe(0);
      expect(await db.userTopic.count({ where })).toBe(0);
      expect(await db.userStats.count({ where })).toBe(0);
      expect(await db.analyticsEvent.count({ where })).toBe(0);
    },
  );

  it("accepts the last available choice and maximum signed integer duration", async () => {
    const q = fx.questions[0]!;
    const response = await makeCaller(fx.user).question.answer({
      ...answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
      choiceIndex: 1,
      timeSpentMs: 2_147_483_647,
    });
    expect(response.isCorrect).toBe(false);
    expect(
      await db.questionAttempt.findFirstOrThrow({
        where: { userId: fx.user.id },
      }),
    ).toMatchObject({ timeSpentMs: 2_147_483_647 });
  });
});

describe("question.answer — authorization", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: [{ difficulty: 1 }],
      enroll: false,
      label: "forbidden",
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("rejects with FORBIDDEN for a course the user is not enrolled in and writes nothing", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;

    await expect(
      caller.question.answer(
        answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const userId = fx.user.id;
    expect(await db.questionAttempt.count({ where: { userId } })).toBe(0);
    expect(await db.userStats.count({ where: { userId } })).toBe(0);
    expect(await db.userQuestion.count({ where: { userId } })).toBe(0);
    expect(await db.userTopic.count({ where: { userId } })).toBe(0);
    expect(await db.userAchievement.count({ where: { userId } })).toBe(0);
  });

  it("rejects with NOT_FOUND for an unknown question id", async () => {
    const caller = makeCaller(fx.user);

    await expect(
      caller.question.answer(
        answerInput({ questionId: "does-not-exist", answerIndex: 0 }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("question.answer — concurrency", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: Array.from({ length: 12 }, () => ({ difficulty: 1 })),
      label: "concurrent",
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("12 parallel answers serialize under the per-user lock with consistent XP and unique achievements", async () => {
    const caller = makeCaller(fx.user);

    const results = await Promise.all(
      fx.questions.map((q) =>
        caller.question.answer(
          answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
        ),
      ),
    );

    expect(results).toHaveLength(12);
    for (const r of results) expect(r.isCorrect).toBe(true);

    const xpSum = results.reduce((sum, r) => sum + r.xpDelta, 0);
    const codesReturned = results.flatMap((r) => r.newlyEarnedCodes);
    const distinctCodes = new Set(codesReturned);
    // Each code is reported as newly earned by exactly one call.
    expect(codesReturned).toHaveLength(distinctCodes.size);
    expect(distinctCodes).toContain("META_FIRST_ANSWER");
    expect(distinctCodes).toContain("VOL_10");

    const userId = fx.user.id;
    const stats = await db.userStats.findUniqueOrThrow({ where: { userId } });
    expect(stats.xp).toBe(xpSum);
    expect(stats.totalQuestionsAnswered).toBe(12);
    expect(stats.totalCorrectAnswers).toBe(12);
    expect(await db.questionAttempt.count({ where: { userId } })).toBe(12);
    expect(await db.userQuestion.count({ where: { userId } })).toBe(12);

    const earned = await db.userAchievement.findMany({
      where: { userId },
      include: { achievement: { select: { code: true } } },
    });
    const pairs = earned.map((e) => `${e.userId}:${e.achievementId}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(earned).toHaveLength(distinctCodes.size);
    expect(new Set(earned.map((e) => e.achievement.code))).toEqual(
      distinctCodes,
    );

    // XP sanity: 12 × 5 base + the catalog rewards of every earned code.
    const catalog = await db.achievement.findMany({
      where: { code: { in: [...distinctCodes] } },
      select: { xpReward: true },
    });
    const rewardSum = catalog.reduce((s, a) => s + a.xpReward, 0);
    expect(stats.xp).toBe(12 * 5 + rewardSum);
  });
});

describe("question.answer — processing timestamps", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: [{ difficulty: 1 }],
      label: "ordered-time",
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("timestamps deliberately reordered requests to the same card in lock-processing order", async () => {
    let reachedLock!: () => void;
    const waitingAtLock = new Promise<void>((resolve) => {
      reachedLock = resolve;
    });
    let releaseLock!: () => void;
    const lockGate = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const delayedDb = db.$extends({
      query: {
        async $executeRaw({ args, query }) {
          reachedLock();
          await lockGate;
          const result: unknown = await query(args);
          return result;
        },
      },
    });
    const delayedCaller = createCaller({
      db: new Proxy(db, {
        get(target, property, receiver) {
          if (property === "$transaction") {
            return delayedDb.$transaction.bind(delayedDb);
          }
          return Reflect.get(target, property, receiver) as unknown;
        },
      }),
      session: { user: fx.user },
      headers: new Headers(),
    });
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;

    const delayedRequest = delayedCaller.question.answer({
      ...answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
      timeSpentMs: 111,
    });
    await waitingAtLock;
    try {
      await caller.question.answer({
        ...answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
        timeSpentMs: 222,
      });
    } finally {
      releaseLock();
      await delayedRequest;
    }

    const attempts = await db.questionAttempt.findMany({
      where: { userId: fx.user.id, questionId: q.id },
      orderBy: { answeredAt: "asc" },
    });
    expect(attempts.map((attempt) => attempt.timeSpentMs)).toEqual([222, 111]);
    expect(attempts[1]!.answeredAt.getTime()).toBeGreaterThan(
      attempts[0]!.answeredAt.getTime(),
    );

    const latestTimestamp = attempts[1]!.answeredAt;
    const card = await db.userQuestion.findUniqueOrThrow({
      where: {
        userId_questionId: { userId: fx.user.id, questionId: q.id },
      },
    });
    const topic = await db.userTopic.findUniqueOrThrow({
      where: {
        userId_topicId: { userId: fx.user.id, topicId: fx.topicId },
      },
    });
    expect(card.lastReview?.getTime()).toBe(latestTimestamp.getTime());
    expect(topic.lastAnsweredAt?.getTime()).toBe(latestTimestamp.getTime());
    expect(topic.masteryUpdatedAt.getTime()).toBe(latestTimestamp.getTime());
  });
});

describe("question.answer — level-5 fixpoint", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: [{ difficulty: 3 }],
      label: "level5",
    });
    const userId = fx.user.id;
    await db.userStats.create({
      data: {
        userId,
        xp: 975,
        level: 4,
        totalQuestionsAnswered: 5,
        totalCorrectAnswers: 5,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: utcToday(),
      },
    });
    const firstAnswer = await db.achievement.findUniqueOrThrow({
      where: { code: "META_FIRST_ANSWER" },
      select: { id: true },
    });
    await db.userAchievement.create({
      data: { userId, achievementId: firstAnswer.id },
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("bonus XP from META_HARD_ANSWER crosses level 5 and unlocks META_LEVEL_5 in the same answer", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;

    const res = await caller.question.answer(
      answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
    );

    expect(res.isCorrect).toBe(true);
    expect(res.newlyEarnedCodes).toContain("META_HARD_ANSWER");
    expect(res.newlyEarnedCodes).toContain("META_LEVEL_5");
    expect(res.newlyEarnedCodes).not.toContain("META_FIRST_ANSWER");
    expect(res.newlyEarned).toEqual(
      expect.arrayContaining([
        { code: "META_HARD_ANSWER", name: "No Easy Road", xpReward: 30 },
        { code: "META_LEVEL_5", name: "Cadet", xpReward: 100 },
      ]),
    );
    expect(res.leveledUp).toBe(true);
    expect(res.newLevel).toBe(5);

    // Nothing else should legitimately fire here (6 correct, streak 1,
    // one topic at ~57 mastery), so the total is exactly base + the two
    // meta rewards. Cross-check against the returned rewards too.
    const rewardSum = res.newlyEarned.reduce((s, a) => s + a.xpReward, 0);
    expect(res.newlyEarned.map((a) => a.code).sort()).toEqual(
      ["META_HARD_ANSWER", "META_LEVEL_5"].sort(),
    );
    expect(rewardSum).toBe(REWARDS.META_HARD_ANSWER! + REWARDS.META_LEVEL_5!);
    expect(res.xpDelta).toBe(20 + rewardSum);

    const stats = await db.userStats.findUniqueOrThrow({
      where: { userId: fx.user.id },
    });
    expect(stats.level).toBe(5);
    expect(stats.xp).toBe(975 + 20 + 30 + 100);
    expect(stats.xp).toBe(975 + 20 + rewardSum);
    expect(stats.totalQuestionsAnswered).toBe(6);
    expect(stats.totalCorrectAnswers).toBe(6);

    const earnedCodes = (
      await db.userAchievement.findMany({
        where: { userId: fx.user.id },
        include: { achievement: { select: { code: true } } },
      })
    )
      .map((e) => e.achievement.code)
      .sort();
    expect(earnedCodes).toEqual(
      ["META_FIRST_ANSWER", "META_HARD_ANSWER", "META_LEVEL_5"].sort(),
    );

    const events = await db.analyticsEvent.findMany({
      where: { userId: fx.user.id },
    });
    expect(events.map((e) => e.eventType)).toContain("level_up");
    expect(
      events.filter((e) => e.eventType === "achievement_earned"),
    ).toHaveLength(2);
  });
});

describe("course.unenroll after answering", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({
      questions: [{ difficulty: 1 }],
      label: "unenroll",
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("wipes per-course user state, removes the enrollment, and blocks further answers", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;
    const userId = fx.user.id;

    const input = answerInput({
      questionId: q.id,
      answerIndex: q.answerIndex,
    });
    const originalResponse = await caller.question.answer(input);
    const originalEventCount = await db.analyticsEvent.count({
      where: { userId },
    });
    expect(await db.questionAttempt.count({ where: { userId } })).toBe(1);
    expect(await db.userQuestion.count({ where: { userId } })).toBe(1);
    expect(await db.userTopic.count({ where: { userId } })).toBe(1);

    await expect(
      caller.course.unenroll({ courseId: fx.courseId }),
    ).resolves.toEqual({ ok: true });

    expect(
      await db.questionAttempt.count({
        where: { userId, topic: { courseId: fx.courseId } },
      }),
    ).toBe(0);
    expect(
      await db.userQuestion.count({
        where: { userId, question: { topic: { courseId: fx.courseId } } },
      }),
    ).toBe(0);
    expect(
      await db.userTopic.count({
        where: { userId, topic: { courseId: fx.courseId } },
      }),
    ).toBe(0);
    expect(
      await db.userCourse.count({ where: { userId, courseId: fx.courseId } }),
    ).toBe(0);

    await expect(caller.question.answer(input)).resolves.toEqual(
      originalResponse,
    );
    expect(await db.questionAnswerReceipt.count({ where: { userId } })).toBe(1);
    expect(await db.analyticsEvent.count({ where: { userId } })).toBe(
      originalEventCount,
    );

    await expect(
      caller.question.answer(
        answerInput({ questionId: q.id, answerIndex: q.answerIndex }),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.questionAttempt.count({ where: { userId } })).toBe(0);
    expect(await db.userQuestion.count({ where: { userId } })).toBe(0);
    expect(await db.userTopic.count({ where: { userId } })).toBe(0);
    expect(await db.userCourse.count({ where: { userId } })).toBe(0);
  });
});
