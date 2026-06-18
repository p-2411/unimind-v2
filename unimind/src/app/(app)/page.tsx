import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import Dashboard from "./dashboard/page";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: user.id },
  });
  if (enrollmentCount === 0) redirect("/onboarding/courses");

  return <Dashboard />;
}
