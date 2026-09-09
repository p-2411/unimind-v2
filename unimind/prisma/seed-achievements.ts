// Idempotent, production-safe seed for the Achievement catalog.
// Upserts every entry of ACHIEVEMENTS by `code`; never deletes anything.
// Run with: npm run db:seed:achievements

import { pathToFileURL } from "node:url";
import { PrismaClient } from "../generated/prisma";
import { ACHIEVEMENTS } from "./achievements-seed";

export async function seedAchievements(prisma: PrismaClient): Promise<number> {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        name: a.name,
        description: a.description,
        category: a.category,
        tier: a.tier,
        xpReward: a.xpReward,
        iconKey: a.iconKey,
      },
      update: {
        name: a.name,
        description: a.description,
        category: a.category,
        tier: a.tier,
        xpReward: a.xpReward,
        iconKey: a.iconKey,
      },
    });
  }
  return ACHIEVEMENTS.length;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("🏅 Seeding achievements...");
    const count = await seedAchievements(prisma);
    console.log(`   ✓ Upserted ${count} achievements`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Error seeding achievements:", e);
    process.exit(1);
  });
}
