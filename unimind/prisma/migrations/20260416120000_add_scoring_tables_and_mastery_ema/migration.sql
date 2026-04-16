-- AlterTable
ALTER TABLE "user_courses" DROP COLUMN "archivedAt",
DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "user_topics" DROP COLUMN "score",
ADD COLUMN     "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "masteryUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "user_questions" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" TEXT NOT NULL,
    "due" TIMESTAMP(3) NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "elapsedDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 0,
    "lastReview" TIMESTAMP(3),

    CONSTRAINT "user_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "rating" INTEGER NOT NULL,
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_questions_userId_due_idx" ON "user_questions"("userId", "due");

-- CreateIndex
CREATE UNIQUE INDEX "user_questions_userId_questionId_key" ON "user_questions"("userId", "questionId");

-- CreateIndex
CREATE INDEX "question_attempts_userId_answeredAt_idx" ON "question_attempts"("userId", "answeredAt");

-- CreateIndex
CREATE INDEX "question_attempts_userId_topicId_answeredAt_idx" ON "question_attempts"("userId", "topicId", "answeredAt");

-- AddForeignKey
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
