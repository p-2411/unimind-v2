import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const enrollmentCount = await db.userCourse.count({
    where: { userId: user.id },
  });
  if (enrollmentCount === 0) redirect("/onboarding/courses");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
