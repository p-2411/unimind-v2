// Bootstrap the bundled study content without creating fixture users or
// resetting progress. Existing content is preserved, including editorial changes.
import { pathToFileURL } from "node:url";
import { PrismaClient } from "../generated/prisma";
import initialData from "./initial_data.json";

export async function seedContent(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const courses = await tx.course.createMany({
      data: initialData.courses,
      skipDuplicates: true,
    });
    const topics = await tx.topic.createMany({
      data: initialData.topics,
      skipDuplicates: true,
    });
    const subtopics = await tx.subtopic.createMany({
      data: initialData.subtopics,
      skipDuplicates: true,
    });
    const questions = await tx.question.createMany({
      data: initialData.questions,
      skipDuplicates: true,
    });
    return { courses: courses.count, topics: topics.count,
      subtopics: subtopics.count, questions: questions.count };
  }, { timeout: 30_000 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  seedContent(prisma)
    .then((counts) => console.log("Study content added:", counts))
    .catch((error: unknown) => {
      console.error("Study content seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
