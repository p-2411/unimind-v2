import { HydrateClient } from "~/trpc/server";

import { DashboardView } from "./dashboard-view";

export default function Home() {
  return (
    <HydrateClient>
      <DashboardView />
    </HydrateClient>
  );
}
