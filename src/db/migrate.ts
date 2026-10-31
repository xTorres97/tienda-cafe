import "server-only";
import path from "node:path";
import type { DB } from "./types";

/** Aplica las migraciones pendientes con el driver que corresponda (Neon o PGlite). */
export async function runMigrations(db: DB) {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if ((process.env.DATABASE_URL ?? "").startsWith("pglite:")) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    await migrate(db as never, { migrationsFolder });
  }
}
