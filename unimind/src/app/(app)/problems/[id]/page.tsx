import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { ProblemDetail } from "./problem-detail";

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const problem = await api.problem.get({ id });
    return <ProblemDetail problem={problem} />;
  } catch {
    notFound();
  }
}
