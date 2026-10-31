// Restablece el catálogo de demostración cada noche (Vercel Cron envía Authorization: Bearer $CRON_SECRET).
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seed } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await seed(await getDb());
  return NextResponse.json({ ok: true });
}
