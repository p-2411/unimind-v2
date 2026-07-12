import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { AuthPane } from "~/components/auth-pane";
import { CoursePicker } from "./course-picker";

export default async function OnboardingCoursesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: session.user.id },
  });
  if (enrollmentCount > 0) redirect("/");

  const courses = await api.course.list();

  return (
    <AuthPane
      eyebrow="Step 2 of 2"
      title="Pick your courses."
      subtitle="We'll seed your question set from these. You can change them later."
    >
      <CoursePicker courses={courses} />
    </AuthPane>
  );
}
