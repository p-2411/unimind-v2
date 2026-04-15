import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { CoursePicker } from "./course-picker";

export default async function OnboardingCoursesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: user.id, isActive: true },
  });
  if (enrollmentCount > 0) redirect("/");

  const courses = await api.course.list();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Pick your courses</h1>
      <p className="mb-6 text-sm text-gray-600">
        Select at least one course to get started.
      </p>
      <CoursePicker courses={courses} />
    </div>
  );
}
