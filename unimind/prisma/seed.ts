import { PrismaClient } from "../generated/prisma";
import initialData from "./initial_data.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Clear course content only — real users (via Supabase auth) are preserved
  console.log("🗑️  Clearing existing course data...");
  await prisma.questionAttempt.deleteMany();
  await prisma.userQuestion.deleteMany();
  await prisma.question.deleteMany();
  await prisma.subtopic.deleteMany();
  await prisma.userTopic.deleteMany();
  await prisma.userCourse.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.course.deleteMany();

  // Seed Courses
  console.log("📚 Seeding courses...");
  for (const course of initialData.courses) {
    await prisma.course.create({
      data: {
        id: course.id,
        name: course.name,
        description: course.description,
        color: course.color,
        icon: course.icon,
        startDate: course.startDate ? new Date(course.startDate) : null,
        flexWeeks: course.flexWeeks ?? [],
      },
    });
  }
  console.log(`   ✓ Created ${initialData.courses.length} courses`);

  // Seed Topics
  console.log("📖 Seeding topics...");
  for (const topic of initialData.topics) {
    await prisma.topic.create({
      data: {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        courseId: topic.courseId,
        weekNumber: topic.weekNumber ?? null,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.topics.length} topics`);

  // Seed Subtopics
  console.log("📑 Seeding subtopics...");
  for (const subtopic of initialData.subtopics) {
    await prisma.subtopic.create({
      data: {
        id: subtopic.id,
        name: subtopic.name,
        description: subtopic.description,
        topicId: subtopic.topicId,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.subtopics.length} subtopics`);

  // Seed Questions
  console.log("❓ Seeding questions...");
  for (const question of initialData.questions) {
    await prisma.question.create({
      data: {
        id: question.id,
        question: question.question,
        choices: question.choices,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        difficulty: question.difficulty,
        topicId: question.topicId,
        subtopicId: question.subtopicId,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.questions.length} questions`);

  // Seed Assessments
  console.log("📝 Seeding assessments...");
  for (const assessment of initialData.assessments) {
    await prisma.assessment.create({
      data: {
        id: assessment.id,
        name: assessment.name,
        courseId: assessment.courseId,
        date: new Date(assessment.date),
        description: assessment.description,
        weekFrom: assessment.weekFrom ?? null,
        weekTo: assessment.weekTo ?? null,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.assessments.length} assessments`);

  // Seed UserStats
  console.log("📊 Seeding user stats...");
  for (const stats of initialData.userStats) {
    await prisma.userStats.create({
      data: {
        id: stats.id,
        userId: stats.userId,
        totalQuestionsAnswered: stats.totalQuestionsAnswered,
        totalCorrectAnswers: stats.totalCorrectAnswers,
        totalTimeSpent: stats.totalTimeSpent,
        level: stats.level,
        xp: stats.xp,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        lastActiveDate: stats.lastActiveDate
          ? new Date(stats.lastActiveDate)
          : null,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.userStats.length} user stats`);

  // Seed UserTopics (with topic name lookup)
  console.log("🎯 Seeding user topics...");
  const topicMap = new Map(initialData.topics.map((t) => [t.id, t.name]));
  for (const userTopic of initialData.userTopics) {
    await prisma.userTopic.create({
      data: {
        id: userTopic.id,
        userId: userTopic.userId,
        topicId: userTopic.topicId,
        topicName: topicMap.get(userTopic.topicId) ?? "Untitled",
        masteryScore: userTopic.score,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.userTopics.length} user topics`);

  // Seed Course Enrollments (many-to-many)
  console.log("🔗 Seeding course enrollments...");
  for (const enrollment of initialData.courseEnrollments) {
    await prisma.userCourse.create({
      data: {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
      },
    });
  }
  console.log(
    `   ✓ Created ${initialData.courseEnrollments.length} course enrollments`
  );

  // Seed Assessment-User relations (many-to-many)
  console.log("🔗 Seeding assessment registrations...");
  for (const registration of initialData.assessmentUsers) {
    await prisma.assessment.update({
      where: { id: registration.assessmentId },
      data: {
        users: {
          connect: { id: registration.userId },
        },
      },
    });
  }
  console.log(
    `   ✓ Created ${initialData.assessmentUsers.length} assessment registrations`
  );

  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
