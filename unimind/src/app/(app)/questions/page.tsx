import { Suspense } from "react";
import { QuestionsView } from "./questions-view";
import QuestionsLoading from "./loading";

export default function QuestionsPage() {
  return (
    <Suspense fallback={<QuestionsLoading />}>
      <QuestionsView />
    </Suspense>
  );
}
