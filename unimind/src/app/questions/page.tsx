import { Suspense } from "react";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { HydrateClient } from "~/trpc/server";
import { QuestionsView } from "./questions-view";

export default function QuestionsPage() {
  return (
    <HydrateClient>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Suspense fallback={null}>
            <QuestionsView />
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}
