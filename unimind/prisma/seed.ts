import { PrismaClient } from "../generated/prisma";
import initialData from "./initial_data.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Clear existing data (in reverse order of dependencies)
  console.log("🗑️  Clearing existing data...");
  await prisma.question.deleteMany();
  await prisma.userTopic.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.userStats.deleteMany();
  await prisma.course.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  console.log("👤 Seeding users...");
  for (const user of initialData.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        password: user.password,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.users.length} users`);

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
      },
    });
  }
  console.log(`   ✓ Created ${initialData.topics.length} topics`);

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
        score: userTopic.score,
      },
    });
  }
  console.log(`   ✓ Created ${initialData.userTopics.length} user topics`);

  // Seed Course Enrollments (many-to-many)
  console.log("🔗 Seeding course enrollments...");
  for (const enrollment of initialData.courseEnrollments) {
    await prisma.user.update({
      where: { id: enrollment.userId },
      data: {
        courses: {
          connect: { id: enrollment.courseId },
        },
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
