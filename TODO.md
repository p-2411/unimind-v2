# TODO

## Database connection / scaling

Currently running on a **direct** Supabase connection (port 5432). Fine for dev and pre-launch. Before launch or when concurrent users grow, revisit:

- **Pooling strategy.** Direct connections don't scale — each Next.js request can open its own Postgres connection and exhaust the server. Options:
  - Supabase **transaction pooler** (port 6543) with `?pgbouncer=true` on `DATABASE_URL` and direct URL kept as `DIRECT_URL` for Prisma migrations. Requires removing interactive `$transaction(async tx => …)` calls (pgbouncer transaction mode doesn't support them reliably).
  - Supabase **session pooler** — less strict, but can still exhaust under hot-reload / many Prisma clients.
  - Move to **Neon** + `@neondatabase/serverless` HTTP driver via Prisma's driver adapter. No persistent connection, no pool exhaustion, very fast cold starts. Tradeoff: no interactive transactions across requests, no LISTEN/NOTIFY.

- **Audit interactive transactions.** `question.answer` currently uses `ctx.db.$transaction(async tx => …)`. If we move to a transaction-mode pooler or HTTP driver, rewrite as sequential idempotent upserts (both steps are already idempotent — the transaction mostly exists for consistency, not correctness).

- **Connection limit tuning.** Set `connection_limit` on the Prisma URL once we know runtime concurrency. Too high = Postgres dies; too low = requests queue.

- **Observability.** Add Prisma query logging / slow-query alerts before scaling so we can see which queries hold connections longest.


## Live counter 
Make live counter represent ACTUAL number of users -- badge only shows when past 100 users