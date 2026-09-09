import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { AuthPane } from "~/components/auth-pane";
import { CoursePicker } from "./course-picker";

export default async function OnboardingCoursesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: user.id },
  });
  if (enrollmentCount > 0) redirect("/");

  const courses = await api.course.list();

  return (
    <AuthPane
      eyebrow="Step 2 of 2"
      title="Pick your courses."
      subtitle="We'll seed your question set from your selection."
    >
      <CoursePicker courses={courses} />
    </AuthPane>
  );
}
