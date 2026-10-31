import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { DB } from "@/db/types";
import { products, variants, type Product, type Variant } from "@/db/schema";

export type ProductWithVariants = Product & { variants: Variant[] };
export type CatalogFilters = {
  region?: string;
  roast?: Product["roast"];
  process?: Product["process"];
  q?: string;
  sort?: "destacados" | "precio-asc" | "precio-desc" | "altitud";
};

export async function listProducts(db: DB, f: CatalogFilters = {}): Promise<ProductWithVariants[]> {
  const conds = [eq(products.active, true)];
  if (f.region) conds.push(eq(products.region, f.region));
  if (f.roast) conds.push(eq(products.roast, f.roast));
  if (f.process) conds.push(eq(products.process, f.process));
  if (f.q?.trim()) {
    const q = `%${f.q.trim()}%`;
    conds.push(
      or(
        ilike(products.name, q), ilike(products.region, q), ilike(products.producer, q),
        sql`array_to_string(${products.notes}, ' ') ilike ${q}`
      )!
    );
  }

  const rows = await db.select().from(products).where(and(...conds)).orderBy(asc(products.id));
  if (rows.length === 0) return [];
  const vs = await db.select().from(variants).where(inArray(variants.productId, rows.map(r => r.id))).orderBy(asc(variants.weightGrams));
  const list = rows.map(r => ({ ...r, variants: vs.filter(v => v.productId === r.id) }));

  const minPrice = (p: ProductWithVariants) => Math.min(...p.variants.map(v => v.priceCents));
  switch (f.sort) {
    case "precio-asc": return list.sort((a, b) => minPrice(a) - minPrice(b));
    case "precio-desc": return list.sort((a, b) => minPrice(b) - minPrice(a));
    case "altitud": return list.sort((a, b) => b.altitude - a.altitude);
    default: return list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id);
  }
}

export async function getProduct(db: DB, slug: string): Promise<ProductWithVariants | null> {
  const [p] = await db.select().from(products).where(and(eq(products.slug, slug), eq(products.active, true)));
  if (!p) return null;
  const vs = await db.select().from(variants).where(eq(variants.productId, p.id)).orderBy(asc(variants.weightGrams));
  return { ...p, variants: vs };
}

export async function listRegions(db: DB) {
  const rows = await db.selectDistinct({ region: products.region }).from(products).where(eq(products.active, true)).orderBy(asc(products.region));
  return rows.map(r => r.region);
}

/** Variantes con su producto, para mostrar y validar el carrito. */
export async function getVariants(db: DB, ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select({ variant: variants, product: products })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(inArray(variants.id, ids));
}
