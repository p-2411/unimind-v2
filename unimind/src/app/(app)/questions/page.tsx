import { Suspense } from "react";
import { HydrateClient } from "~/trpc/server";
import { QuestionsView } from "./questions-view";

export default function QuestionsPage() {
  return (
    <HydrateClient>
      <Suspense fallback={null}>
        <QuestionsView />
      </Suspense>
    </HydrateClient>
  );
}
