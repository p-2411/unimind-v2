import { randomUUID } from "node:crypto";

import { ensureUserProfile } from "./profile";
import { cleanup, db } from "../../../test/fixtures";

describe("ensureUserProfile (integration)", () => {
  const id = randomUUID();
  const email = `int-profile-${id}@example.test`;

  afterAll(async () => {
    await cleanup(id);
    await db.$disconnect();
  });

  it("20 concurrent first-request calls all resolve and create exactly one row", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        ensureUserProfile(db, { id, email, name: "A" }),
      ),
    );

    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toEqual([]);

    const rows = await db.user.findMany({ where: { id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id, email, name: "A" });
  });

  it("never overwrites an existing row's name", async () => {
    await ensureUserProfile(db, { id, email, name: "B" });

    const row = await db.user.findUniqueOrThrow({ where: { id } });
    expect(row.name).toBe("A");
    expect(await db.user.count({ where: { id } })).toBe(1);
  });
});
