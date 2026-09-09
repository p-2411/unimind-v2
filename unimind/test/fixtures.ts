import { randomUUID } from "node:crypto";

import { createCaller } from "~/server/api/root";
import { db } from "~/server/db";

export type FixtureUser = { id: string; email: string };

export type FixtureQuestion = {
  id: string;
  difficulty: number;
  answerIndex: number;
};

export type Fixture = {
  user: FixtureUser;
  courseId: string;
  topicId: string;
  subtopicId: string;
  questions: FixtureQuestion[];
};

export type QuestionSpec = {
  difficulty?: number;
  answerIndex?: number;
};

/** Midnight UTC of the current day, as `question.answer` computes it. */
export function utcToday(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

/** Midnight UTC `days` days before today. */
export function utcDaysAgo(days: number): Date {
  return new Date(utcToday().getTime() - days * 86_400_000);
}

export async function createUser(name = "Test User"): Promise<FixtureUser> {
  const id = randomUUID();
  const email = `int-${id}@example.test`;
  await db.user.create({ data: { id, email, name } });
  return { id, email };
}

/**
 * Inserts Course → Topic → Subtopic → N Questions. Every question is a
 * 4-choice item; `answerIndex` defaults to 0 and `difficulty` to 1.
 */
export async function createCourse(
  questionSpecs: QuestionSpec[],
  label = "int",
): Promise<Omit<Fixture, "user">> {
  const courseId = randomUUID();
  const topicId = randomUUID();
  const subtopicId = randomUUID();

  await db.course.create({
    data: {
      id: courseId,
      name: `Course ${label} ${courseId.slice(0, 8)}`,
      topics: {
        create: {
          id: topicId,
          name: `Topic ${label}`,
          subTopics: { create: { id: subtopicId, name: `Subtopic ${label}` } },
        },
      },
    },
  });

  const questions: FixtureQuestion[] = questionSpecs.map((spec) => ({
    id: randomUUID(),
    difficulty: spec.difficulty ?? 1,
    answerIndex: spec.answerIndex ?? 0,
  }));

  if (questions.length > 0) {
    await db.question.createMany({
      data: questions.map((q, i) => ({
        id: q.id,
        question: `Question ${label} #${i + 1}`,
        choices: ["A", "B", "C", "D"],
        answerIndex: q.answerIndex,
        difficulty: q.difficulty,
        topicId,
        subtopicId,
      })),
    });
  }

  return { courseId, topicId, subtopicId, questions };
}

export async function enroll(userId: string, courseId: string): Promise<void> {
  await db.userCourse.create({ data: { userId, courseId } });
}

/**
 * Fresh user + course with the given questions; enrolls the user unless
 * `enroll: false`.
 */
export async function createFixture(opts: {
  questions: QuestionSpec[];
  enroll?: boolean;
  label?: string;
}): Promise<Fixture> {
  const user = await createUser();
  const course = await createCourse(opts.questions, opts.label);
  if (opts.enroll !== false) {
    await enroll(user.id, course.courseId);
  }
  return { user, ...course };
}

export function makeCaller(user: FixtureUser) {
  return createCaller({
    db,
    session: { user: { id: user.id, email: user.email } },
    headers: new Headers(),
  });
}

/**
 * Deletes the user and the course(s); every per-user and per-course table
 * cascades. Analytics events only `SetNull` on user delete, so they are
 * removed explicitly.
 */
export async function cleanup(
  userId: string | null,
  ...courseIds: (string | undefined)[]
): Promise<void> {
  if (userId) {
    await db.analyticsEvent.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
  }
  const ids = courseIds.filter((c): c is string => Boolean(c));
  if (ids.length > 0) {
    await db.course.deleteMany({ where: { id: { in: ids } } });
  }
}

export { db };
