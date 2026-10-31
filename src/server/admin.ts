import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db/types";
import { orderItems, orders, products, variants, type OrderStatus } from "@/db/schema";
import { ShopError } from "./errors";
import { restock } from "./checkout";

/** Cambios de estado permitidos desde el panel. */
export const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
};

export async function setOrderStatus(db: DB, orderId: string, next: OrderStatus, now = new Date()) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new ShopError("order_not_found", "Pedido no encontrado");
    if (!TRANSITIONS[order.status]?.includes(next)) {
      throw new ShopError("invalid_transition", `No se puede pasar de ${order.status} a ${next}`);
    }
    const updated = await tx
      .update(orders)
      .set({ status: next, updatedAt: now })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
      .returning();
    if (updated.length === 0) throw new ShopError("invalid_transition", "El pedido cambió mientras lo editabas");
    if (next === "cancelled") await restock(tx as unknown as DB, [orderId]);
    return updated[0];
  });
}

export async function listOrders(db: DB, opts: { status?: OrderStatus; limit?: number } = {}) {
  const rows = await db
    .select()
    .from(orders)
    .where(opts.status ? eq(orders.status, opts.status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(opts.limit ?? 100);
  const items = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map(r => r.id))) : [];
  return rows.map(r => ({ ...r, items: items.filter(i => i.orderId === r.id) }));
}

export async function updateVariant(db: DB, variantId: number, data: { stock?: number; priceCents?: number }) {
  if (data.stock !== undefined && (!Number.isInteger(data.stock) || data.stock < 0 || data.stock > 10_000)) {
    throw new ShopError("invalid_input", "El stock tiene que ser un número entre 0 y 10.000");
  }
  if (data.priceCents !== undefined && (!Number.isInteger(data.priceCents) || data.priceCents < 100 || data.priceCents > 100_000)) {
    throw new ShopError("invalid_input", "El precio tiene que estar entre $1 y $1.000");
  }
  const [v] = await db.update(variants).set(data).where(eq(variants.id, variantId)).returning();
  if (!v) throw new ShopError("invalid_input", "Variante no encontrada");
  return v;
}

export async function setProductActive(db: DB, productId: number, active: boolean) {
  await db.update(products).set({ active }).where(eq(products.id, productId));
}

export async function dashboardStats(db: DB) {
  const [row] = await db
    .select({
      paidCount: sql<number>`count(*) filter (where ${orders.status} in ('paid','preparing','shipped','delivered'))::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} in ('paid','preparing','shipped','delivered')), 0)::int`,
      toPrepare: sql<number>`count(*) filter (where ${orders.status} = 'paid')::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} = 'pending_payment')::int`,
    })
    .from(orders);
  const [low] = await db.select({ n: sql<number>`count(*)::int` }).from(variants).where(sql`${variants.stock} <= 3`);
  return { ...row, lowStock: low.n };
}
