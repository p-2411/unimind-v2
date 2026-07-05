import type { PrismaClient } from "../../../../generated/prisma";

/**
 * Returns the questionId of the next card the given user should see.
 *
 * Single ranking rule covers cold start, queue empty, and overdue:
 *   - Unseen questions (no UserQuestion row) bubble first via NULLS FIRST.
 *   - Then most-overdue (smallest `due`).
 *   - Then nearest-future-due.
 *
 * Filtered to questions in courses the user is enrolled in, and to topics
 * at or before the current week. Current week is derived from course.startDate
 * unless UserCourse.currentWeekOverride is set. Topics with no weekNumber are
 * always included. Courses with no startDate and no override are always included.
 */
export async function pickNextQuestionId(
  db: PrismaClient,
  userId: string,
): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT q.id
    FROM "questions" q
    JOIN "topics" t ON t.id = q."topicId"
    JOIN "courses" c ON c.id = t."courseId"
    JOIN "user_courses" uc
      ON uc."courseId" = t."courseId"
     AND uc."userId" = ${userId}::uuid
    LEFT JOIN "user_questions" uq
      ON uq."questionId" = q.id
     AND uq."userId" = ${userId}::uuid
    WHERE
      t."weekNumber" IS NULL
      OR c."startDate" IS NULL
      OR t."weekNumber" <= COALESCE(
        uc."currentWeekOverride",
        GREATEST(1,
          (FLOOR(EXTRACT(EPOCH FROM (NOW() - c."startDate")) / 604800)::int + 1)
          - (
            SELECT COUNT(*)::int
            FROM unnest(c."flexWeeks") AS fw(wk)
            WHERE fw.wk <= (FLOOR(EXTRACT(EPOCH FROM (NOW() - c."startDate")) / 604800)::int + 1)
          )
        )
      )
    ORDER BY uq."due" ASC NULLS FIRST, q.id ASC
    LIMIT 1;
  `;
  return rows[0]?.id ?? null;
}
