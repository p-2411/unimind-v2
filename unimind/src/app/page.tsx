import Link from "next/link";

import { api, HydrateClient } from "~/trpc/server";
import { AppSidebar } from "~/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "~/components/ui/sidebar";

import Dashboard from "./dashboard/page"

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

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
