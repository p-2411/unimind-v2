import type { PrismaClient } from "../../../../generated/prisma";

/**
 * Returns the questionId of the next card the given user should see.
 *
 * Single ranking rule covers cold start, queue empty, and overdue:
 *   - Unseen questions (no UserQuestion row) bubble first via NULLS FIRST.
 *   - Then most-overdue (smallest `due`).
 *   - Then nearest-future-due.
 *
 * Filtered to questions in courses the user is enrolled in. Returns null
 * if the user has no enrolled courses or no questions exist in them.
 */
export async function pickNextQuestionId(
  db: PrismaClient,
  userId: string,
): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT q.id
    FROM "questions" q
    JOIN "topics" t ON t.id = q."topicId"
    JOIN "user_courses" uc
      ON uc."courseId" = t."courseId"
     AND uc."userId" = ${userId}::uuid
    LEFT JOIN "user_questions" uq
      ON uq."questionId" = q.id
     AND uq."userId" = ${userId}::uuid
    ORDER BY uq."due" ASC NULLS FIRST
    LIMIT 1;
  `;
  return rows[0]?.id ?? null;
}
