import type { PrismaClient } from "../../../../generated/prisma";

/**
 * Returns the questionId of the next card the given user should see.
 *
 * Ranking (in order):
 *   1. Assessment urgency tier for the question's course:
 *        0 — nearest upcoming assessment ≤ 3 days away
 *        1 — nearest upcoming assessment ≤ 7 days away
 *        2 — nearest upcoming assessment ≤ 30 days away
 *        3 — no upcoming assessment or > 30 days away
 *   2. Nearest upcoming assessment date ASC (earlier exam wins within same tier).
 *   3. Topic in assessment's week range (weekFrom–weekTo) — 0 if covered, 1 if not.
 *      Assessments with no week range (e.g. final exam) cover all topics equally.
 *   4. FSRS due date: unseen (no UserQuestion row) first via NULLS FIRST,
 *      then most-overdue, then nearest-future-due.
 *
 * Filtered to enrolled courses and topics at or before the current week.
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
    LEFT JOIN LATERAL (
      SELECT a."date" AS next_assessment, a."weekFrom" AS week_from, a."weekTo" AS week_to
      FROM "assessments" a
      WHERE a."courseId" = c.id
        AND a."date" > NOW()
      ORDER BY a."date" ASC
      LIMIT 1
    ) na ON true
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
    ORDER BY
      CASE
        WHEN na.next_assessment IS NOT NULL AND na.next_assessment <= NOW() + INTERVAL '3 days'  THEN 0
        WHEN na.next_assessment IS NOT NULL AND na.next_assessment <= NOW() + INTERVAL '7 days'  THEN 1
        WHEN na.next_assessment IS NOT NULL AND na.next_assessment <= NOW() + INTERVAL '30 days' THEN 2
        ELSE 3
      END ASC,
      na.next_assessment ASC NULLS LAST,
      -- Within same urgency+assessment, prefer topics in this assessment's week range
      CASE
        WHEN na.week_from IS NOT NULL
         AND na.week_to   IS NOT NULL
         AND t."weekNumber" IS NOT NULL
         AND t."weekNumber" >= na.week_from
         AND t."weekNumber" <= na.week_to THEN 0
        ELSE 1
      END ASC,
      uq."due" ASC NULLS FIRST,
      q.id ASC
    LIMIT 1;
  `;
  return rows[0]?.id ?? null;
}
