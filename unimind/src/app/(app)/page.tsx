import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import Dashboard from "./dashboard/page";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: session.user.id },
  });
  if (enrollmentCount === 0) redirect("/onboarding/courses");

  return <Dashboard />;
}
