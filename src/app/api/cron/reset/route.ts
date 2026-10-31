// Aplica migraciones pendientes y restablece el catálogo de demostración.
// Vercel Cron lo llama cada noche con "Authorization: Bearer $CRON_SECRET".
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runMigrations } from "@/db/migrate";
import { seed } from "@/db/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const db = await getDb();
  await runMigrations(db);
  await seed(db);
  return NextResponse.json({ ok: true });
}
