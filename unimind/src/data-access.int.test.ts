import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma";
import { db } from "./server/db";

// Model a browser role even when this isolated Postgres has no Supabase roles.
// Grant table privileges deliberately: RLS must still prevent direct access.
const role = `unimind_rls_${randomUUID().replaceAll("-", "")}`;
const userId = randomUUID();
const roleSql = Prisma.raw(`"${role}"`);
let roleCreated = false;

beforeAll(async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("Role-isolation tests require a local throwaway PostgreSQL");
  }
  await db.$executeRaw`CREATE ROLE ${roleSql} NOLOGIN NOSUPERUSER NOBYPASSRLS`;
  roleCreated = true;
  await db.$executeRaw`GRANT USAGE ON SCHEMA public TO ${roleSql}`;
  await db.$executeRaw`GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO ${roleSql}`;
  await db.user.create({ data: { id: userId, email: `${userId}@example.test` } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } });
  if (roleCreated) {
    await db.$executeRaw`REVOKE ALL ON public.users FROM ${roleSql}`;
    await db.$executeRaw`REVOKE USAGE ON SCHEMA public FROM ${roleSql}`;
    await db.$executeRaw`DROP ROLE ${roleSql}`;
  }
  await db.$disconnect();
});

it("enables RLS on every application table, including receipts and migration metadata", async () => {
  const tables = await db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `;
  expect(tables.map((t) => t.relname)).toContain("question_answer_receipts");
  expect(tables.filter((t) => !t.relrowsecurity)).toEqual([]);
});

it("prevents browser-role reads and updates even with explicit table grants", async () => {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL ROLE ${roleSql}`;
    expect(await tx.user.findMany({ where: { id: userId } })).toEqual([]);
    expect(await tx.user.updateMany({ where: { id: userId }, data: { name: "unauthorized" } }))
      .toEqual({ count: 0 });
    expect(await tx.user.deleteMany({ where: { id: userId } })).toEqual({ count: 0 });
  });
  expect(await db.user.findUniqueOrThrow({ where: { id: userId } })).toMatchObject({ name: null });
});

it("rejects browser-role inserts while leaving backend-owner access intact", async () => {
  await expect(db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL ROLE ${roleSql}`;
    await tx.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.test` } });
  })).rejects.toThrow(/row.level security/i);
  expect(await db.user.count({ where: { id: userId } })).toBe(1);
});
