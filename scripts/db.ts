// Uso: pnpm db:setup  → aplica migraciones y carga el catálogo de ejemplo
//      pnpm db:migrate → solo migraciones (para producción)
import * as schema from "../src/db/schema";
import type { DB } from "../src/db/types";
import { seed } from "../src/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const withSeed = process.argv.includes("--seed");
  let db: DB;
  let close: () => Promise<unknown>;

  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite(url.slice("pglite:".length));
    const d = drizzle(client, { schema });
    await migrate(d, { migrationsFolder: "./drizzle" });
    db = d as unknown as DB;
    close = () => client.close();
  } else {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    const pool = new Pool({ connectionString: url });
    const d = drizzle(pool, { schema });
    await migrate(d, { migrationsFolder: "./drizzle" });
    db = d as unknown as DB;
    close = () => pool.end();
  }
  console.log("✓ Migraciones aplicadas");
  if (withSeed) { await seed(db); console.log("✓ Catálogo de ejemplo cargado"); }
  await close();
}

main().catch(e => { console.error(e); process.exit(1); });
