import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// For uptime monitors and the host's health checks. Stays up on Shabbat (see middleware).
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
