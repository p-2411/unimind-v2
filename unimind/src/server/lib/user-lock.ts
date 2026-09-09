import type { Prisma } from "../../../generated/prisma";

/**
 * Transaction-scoped per-user advisory lock. Serialises every mutation that
 * reads-then-writes a user's per-course/gamification state (answer, unenroll).
 *
 * Requires an interactive `$transaction` running on a dedicated backend (the
 * session pooler) — the lock is bound to that backend's transaction and is
 * released automatically on commit or rollback.
 *
 * Uses `$executeRaw` deliberately: `pg_advisory_xact_lock` returns `void`,
 * which `$queryRaw` cannot deserialise (Prisma P2010).
 */
export async function lockUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}
