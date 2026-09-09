import {
  cleanup,
  createCourse,
  createFixture,
  db,
  enroll,
  makeCaller,
  utcDaysAgo,
  type Fixture,
} from "../../../../test/fixtures";

afterAll(async () => {
  await db.$disconnect();
});

describe("user.dashboardStats — lapsed streak", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await createFixture({ questions: [], label: "streak" });
    await db.userStats.create({
      data: {
        userId: fx.user.id,
        xp: 40,
        level: 1,
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: utcDaysAgo(3),
      },
    });
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId);
  });

  it("reports currentStreak 0 when lastActiveDate is 3 days ago, leaving longestStreak intact", async () => {
    const caller = makeCaller(fx.user);

    const stats = await caller.user.dashboardStats();

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(5);
    expect(stats.xp).toBe(40);

    // Read path only — the stored row is not rewritten until the next answer.
    const row = await db.userStats.findUniqueOrThrow({
      where: { userId: fx.user.id },
    });
    expect(row.currentStreak).toBe(5);
    expect(row.longestStreak).toBe(5);
  });
});

describe("achievement.listForUser — distinctCoursesPracticed", () => {
  let fx: Fixture;
  let secondCourseId: string;

  beforeAll(async () => {
    fx = await createFixture({ questions: [{ difficulty: 1 }], label: "breadth-a" });
    const second = await createCourse([{ difficulty: 1 }], "breadth-b");
    secondCourseId = second.courseId;
    await enroll(fx.user.id, secondCourseId);
  });

  afterAll(async () => {
    await cleanup(fx.user.id, fx.courseId, secondCourseId);
  });

  it("counts practiced courses (UserTopic rows), not enrollments: 2 enrolled, 1 practiced → progress 0.5", async () => {
    const caller = makeCaller(fx.user);
    const q = fx.questions[0]!;

    await caller.question.answer({
      questionId: q.id,
      choiceIndex: q.answerIndex,
      rating: 3,
      source: "in_app",
    });

    expect(await db.userCourse.count({ where: { userId: fx.user.id } })).toBe(2);
    expect(await db.userTopic.count({ where: { userId: fx.user.id } })).toBe(1);

    const list = await caller.achievement.listForUser();

    expect(
      list.earned.map((e) => e.achievement.code),
    ).not.toContain("BREADTH_2_COURSES");
    const polymath = list.locked.find(
      (l) => l.achievement.code === "BREADTH_2_COURSES",
    );
    expect(polymath).toBeDefined();
    expect(polymath!.progress).toBe(0.5);

    expect(
      await db.userAchievement.count({
        where: { userId: fx.user.id, achievement: { code: "BREADTH_2_COURSES" } },
      }),
    ).toBe(0);
  });
});
