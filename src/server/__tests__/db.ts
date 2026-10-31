import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { DB } from "@/db/types";
import { seed } from "@/db/seed";

/** Postgres real en memoria con las mismas migraciones que producción. */
export async function testDb(): Promise<DB> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seed(db as unknown as DB);
  return db as unknown as DB;
}
