import { HydrateClient } from "~/trpc/server";
import { QuestionsView } from "./questions-view";

export default function QuestionsPage() {
  return (
    <HydrateClient>
      <QuestionsView />
    </HydrateClient>
  );
}
