import { Suspense } from "react";
import { QuestionsView } from "./questions-view";

export default function QuestionsPage() {
  return (
    <Suspense fallback={null}>
      <QuestionsView />
    </Suspense>
  );
}
