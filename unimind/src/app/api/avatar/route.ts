import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED_TYPES[file.type]) return NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const url = `data:${file.type};base64,${base64}`;

  await db.user.update({ where: { id: session.user.id }, data: { image: url } });

  return NextResponse.json({ url });
}
