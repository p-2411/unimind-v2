import type { PrismaClient } from "../../../generated/prisma";

/**
 * Lazily creates the `public.users` profile row for an authenticated
 * Supabase user. Safe under concurrent first requests and never modifies an
 * existing row.
 *
 * `createMany` with `skipDuplicates` compiles to a native
 * `INSERT … ON CONFLICT DO NOTHING` on Postgres, so racing callers cannot hit
 * P2002. (`upsert` with an empty `update` is NOT race-safe in Prisma 6 — it is
 * executed as SELECT-then-INSERT rather than a native upsert.)
 */
export async function ensureUserProfile(
  db: PrismaClient,
  input: { id: string; email: string; name: string | null },
): Promise<void> {
  await db.user.createMany({
    data: [{ id: input.id, email: input.email, name: input.name }],
    skipDuplicates: true,
  });
}
