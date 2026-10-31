import { sql } from "drizzle-orm";
import type { DB } from "./types";
import { orderItems, orders, payments, products, variants, webhookEvents } from "./schema";
import { SEED_PRODUCTS, priceFor } from "./seed-data";

/** Deja la base con el catálogo de ejemplo. Borra pedidos y pagos (es una demo). */
export async function seed(db: DB) {
  await db.transaction(async tx => {
    await tx.delete(webhookEvents);
    await tx.delete(payments);
    await tx.delete(orderItems);
    await tx.delete(orders);
    await tx.delete(variants);
    await tx.delete(products);
    await tx.execute(sql`alter sequence orders_number_seq restart with 1001`);

    for (const p of SEED_PRODUCTS) {
      const { price250, stock, ...data } = p;
      const [row] = await tx.insert(products).values(data).returning({ id: products.id });
      const weights = [250, 500, 1000] as const;
      await tx.insert(variants).values(
        weights.map((w, i) => ({
          productId: row.id,
          sku: `SB-${p.slug.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "").slice(0, 6)}-${w}`,
          weightGrams: w,
          priceCents: priceFor(price250, w),
          stock: stock[i],
        }))
      );
    }
  });
}
