import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "~/lib/auth";
import { GroupDetail } from "./group-detail";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  return <GroupDetail groupId={id} currentUserId={session.user.id} />;
}
