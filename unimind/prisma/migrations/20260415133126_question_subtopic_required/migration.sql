/*
  Warnings:

  - Made the column `subtopicId` on table `questions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_subtopicId_fkey";

-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "subtopicId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "subtopics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
