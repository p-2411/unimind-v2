-- CreateTable
CREATE TABLE "question_answer_receipts" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "payloadFingerprint" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_answer_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_answer_receipts_userId_attemptId_key" ON "question_answer_receipts"("userId", "attemptId");

-- CreateIndex
CREATE INDEX "question_answer_receipts_userId_createdAt_idx" ON "question_answer_receipts"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "question_answer_receipts" ADD CONSTRAINT "question_answer_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
