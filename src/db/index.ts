import "server-only";
import * as schema from "./schema";
import type { DB } from "./types";

let dbPromise: Promise<DB> | null = null;

/**
 * Producción: Neon por WebSocket (soporta transacciones, necesarias para reservar stock).
 * Desarrollo local sin Neon: DATABASE_URL=pglite:./.pglite usa Postgres embebido en un archivo.
 */
export function getDb(): Promise<DB> {
  if (dbPromise) return dbPromise;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (usa pglite:./.pglite para desarrollo local)");

  dbPromise = (async () => {
    if (url.startsWith("pglite:")) {
      const { PGlite } = await import("@electric-sql/pglite");
      const { drizzle } = await import("drizzle-orm/pglite");
      return drizzle(new PGlite(url.slice("pglite:".length)), { schema }) as unknown as DB;
    }
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    return drizzle(new Pool({ connectionString: url }), { schema }) as unknown as DB;
  })();
  return dbPromise;
}
