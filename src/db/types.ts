import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Tipo común para Neon (producción) y PGlite (tests): la lógica recibe la base por parámetro. */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
