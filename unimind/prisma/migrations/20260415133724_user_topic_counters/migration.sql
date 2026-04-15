-- AlterTable
ALTER TABLE "user_topics" ADD COLUMN     "correctCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAnsweredAt" TIMESTAMP(3),
ADD COLUMN     "totalCount" INTEGER NOT NULL DEFAULT 0;
