import Link from "next/link";

import { auth, signIn } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { AppSidebar } from "~/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "~/components/ui/sidebar";

import Dashboard from "./dashboard/page"
import { redirect } from "next/navigation";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return (
    <HydrateClient>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}
