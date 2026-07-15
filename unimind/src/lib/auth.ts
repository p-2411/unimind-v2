import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "~/server/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  advanced: {
    database: {
      // Our User.id column is typed as UUID in Postgres; generate UUIDs in app code.
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: "Mastify <noreply@mastify.app>",
        to: user.email,
        subject: "Reset your password",
        html: `
          <p>Hi ${user.name ?? "there"},</p>
          <p>Click the link below to reset your Mastify password. It expires in 1 hour.</p>
          <p><a href="${url}">${url}</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
        `,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const firstName = user.name?.split(" ")[0] ?? "there";
          await resend.emails.send({
            from: "Mastify <noreply@mastify.app>",
            to: user.email,
            subject: "Let's get you caught up 🎓",
            html: `
              <p>Hey ${firstName},</p>
              <p>Welcome to Mastify — the CS practice console built for uni students who actually want to understand the material, not just pass the exam.</p>
              <p>Here's how it works: enroll in your courses, and we'll serve you practice questions based on what's due and what you're weakest on. Answer one before you open YouTube. You'll be surprised how fast it adds up.</p>
              <p>Get started → <a href="https://mastify.app">mastify.app</a></p>
              <p>Good luck this semester. You've got this.</p>
              <p>— The Mastify team</p>
            `,
          });
        },
      },
    },
  },
  plugins: [
    bearer(), // lets extension routes authenticate via Authorization: Bearer <session-token>
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});

export type Auth = typeof auth;
