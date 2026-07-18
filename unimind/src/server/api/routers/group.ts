import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function assertMember(userId: string, groupId: string) {
  const m = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!m) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group" });
  return m;
}

export const groupRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(50).trim() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      let inviteCode = generateInviteCode();
      for (let i = 0; i < 5; i++) {
        const existing = await ctx.db.studyGroup.findUnique({ where: { inviteCode } });
        if (!existing) break;
        inviteCode = generateInviteCode();
      }
      return ctx.db.studyGroup.create({
        data: {
          name: input.name,
          inviteCode,
          members: { create: { userId, role: "owner" } },
        },
      });
    }),

  join: protectedProcedure
    .input(z.object({ inviteCode: z.string().trim().toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const group = await ctx.db.studyGroup.findUnique({
        where: { inviteCode: input.inviteCode },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found — check the invite code" });

      await ctx.db.groupMembership.upsert({
        where: { userId_groupId: { userId, groupId: group.id } },
        create: { userId, groupId: group.id, role: "member" },
        update: {},
      });
      return group;
    }),

  leave: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.groupMembership.deleteMany({
        where: { userId, groupId: input.groupId },
      });
    }),

  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.studyGroup.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId }, select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertMember(userId, input.groupId);
      return ctx.db.studyGroup.findUnique({
        where: { id: input.groupId },
        include: { _count: { select: { members: true } } },
      });
    }),

  leaderboard: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertMember(userId, input.groupId);

      const members = await ctx.db.groupMembership.findMany({
        where: { groupId: input.groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              stats: { select: { level: true, xp: true, currentStreak: true } },
              topics: { select: { masteryScore: true } },
            },
          },
        },
      });

      return members
        .map((m) => ({
          userId: m.userId,
          name: m.user.name ?? "Anonymous",
          image: m.user.image,
          role: m.role as "owner" | "member",
          level: m.user.stats?.level ?? 1,
          xp: m.user.stats?.xp ?? 0,
          streak: m.user.stats?.currentStreak ?? 0,
          mastery:
            m.user.topics.length > 0
              ? Math.round(
                  m.user.topics.reduce((s, t) => s + t.masteryScore, 0) / m.user.topics.length,
                )
              : 0,
        }))
        .sort((a, b) => b.xp - a.xp);
    }),

  messages: protectedProcedure
    .input(z.object({ groupId: z.string(), cursor: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertMember(userId, input.groupId);

      const msgs = await ctx.db.groupMessage.findMany({
        where: { groupId: input.groupId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      return msgs.reverse();
    }),

  sendMessage: protectedProcedure
    .input(z.object({ groupId: z.string(), content: z.string().min(1).max(500).trim() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertMember(userId, input.groupId);

      return ctx.db.groupMessage.create({
        data: { groupId: input.groupId, userId, content: input.content },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),
});
