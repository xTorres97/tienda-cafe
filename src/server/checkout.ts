import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/types";
import { orderItems, orders, payments, products, variants } from "@/db/schema";
import { MAX_QTY_PER_LINE, RESERVATION_MINUTES, shippingFor } from "@/lib/money";
import { ShopError } from "./errors";
import { newId } from "./ids";

export const checkoutSchema = z
  .object({
    items: z
      .array(z.object({
        variantId: z.number().int().positive(),
        grind: z.enum(["grano", "espresso", "media", "gruesa"]),
        quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
      }))
      .min(1, "El carrito está vacío")
      .max(20),
    name: z.string().trim().min(3, "Escribe tu nombre completo").max(80),
    email: z.email("Escribe un email válido").max(120),
    phone: z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/, "Escribe un teléfono válido, por ejemplo 0414 555 0123"),
    shippingMethod: z.enum(["retiro", "envio"]),
    address: z
      .object({
        line1: z.string().trim().min(5, "Escribe la dirección").max(160),
        city: z.string().trim().min(2, "Escribe la ciudad").max(60),
        state: z.string().trim().min(2, "Elige el estado").max(60),
        notes: z.string().trim().max(200).optional(),
      })
      .optional(),
  })
  .refine(d => d.shippingMethod === "retiro" || !!d.address, { path: ["address"], message: "Falta la dirección de envío" });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Crea el pedido reservando stock dentro de una transacción.
 * Los precios salen siempre de la base de datos, nunca del navegador.
 */
export async function createOrder(db: DB, raw: unknown, now = new Date()) {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ShopError("invalid_input", parsed.error.issues[0]?.message ?? "Datos inválidos", {
      fields: Object.fromEntries(parsed.error.issues.map(i => [i.path.join("."), i.message])),
    });
  }
  const input = parsed.data;

  await expireStaleOrders(db, now);

  // Unificar líneas repetidas (misma variante y molienda)
  const lines = new Map<string, { variantId: number; grind: CheckoutInput["items"][number]["grind"]; quantity: number }>();
  for (const it of input.items) {
    const key = `${it.variantId}:${it.grind}`;
    const prev = lines.get(key);
    lines.set(key, { ...it, quantity: Math.min(MAX_QTY_PER_LINE, (prev?.quantity ?? 0) + it.quantity) });
  }
  const items = [...lines.values()];

  return db.transaction(async tx => {
    const ids = [...new Set(items.map(i => i.variantId))];
    const rows = await tx
      .select({ v: variants, p: products })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(inArray(variants.id, ids));

    // Reservar: un UPDATE condicional por variante evita vender de más con compras simultáneas
    const qtyByVariant = new Map<number, number>();
    for (const it of items) qtyByVariant.set(it.variantId, (qtyByVariant.get(it.variantId) ?? 0) + it.quantity);

    for (const [variantId, qty] of qtyByVariant) {
      const row = rows.find(r => r.v.id === variantId);
      if (!row || !row.p.active) throw new ShopError("product_unavailable", "Uno de los productos ya no está disponible", { variantId });
      const updated = await tx
        .update(variants)
        .set({ stock: sql`${variants.stock} - ${qty}` })
        .where(and(eq(variants.id, variantId), gte(variants.stock, qty)))
        .returning({ id: variants.id });
      if (updated.length === 0) {
        throw new ShopError("out_of_stock", `No queda suficiente ${row.p.name} de ${row.v.weightGrams} g`, {
          variantId, available: row.v.stock,
        });
      }
    }

    const subtotal = items.reduce((s, it) => s + rows.find(r => r.v.id === it.variantId)!.v.priceCents * it.quantity, 0);
    const shipping = shippingFor(input.shippingMethod, subtotal);
    const orderId = newId("ord");

    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone,
        shippingMethod: input.shippingMethod,
        address: input.shippingMethod === "envio" ? input.address : null,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        reservedUntil: new Date(now.getTime() + RESERVATION_MINUTES * 60_000),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(orderItems).values(
      items.map(it => {
        const r = rows.find(x => x.v.id === it.variantId)!;
        return {
          orderId, variantId: it.variantId, productName: r.p.name, weightGrams: r.v.weightGrams,
          grind: it.grind, unitPriceCents: r.v.priceCents, quantity: it.quantity,
        };
      })
    );

    const [payment] = await tx
      .insert(payments)
      .values({ id: newId("pay"), orderId, provider: "simulado", amountCents: order.totalCents, createdAt: now, updatedAt: now })
      .returning();

    return { order, payment };
  });
}

/** Devuelve el stock de los pedidos que no se pagaron a tiempo. Es idempotente. */
export async function expireStaleOrders(db: DB, now = new Date()) {
  return db.transaction(async tx => {
    const stale = await tx
      .update(orders)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(orders.status, "pending_payment"), lt(orders.reservedUntil, now)))
      .returning({ id: orders.id });
    if (stale.length) await restock(tx as unknown as DB, stale.map(s => s.id));
    return stale.length;
  });
}

/** Suma de vuelta al inventario las unidades de los pedidos indicados. */
export async function restock(db: DB, orderIds: string[]) {
  if (orderIds.length === 0) return;
  const its = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  const byVariant = new Map<number, number>();
  for (const it of its) byVariant.set(it.variantId, (byVariant.get(it.variantId) ?? 0) + it.quantity);
  for (const [variantId, qty] of byVariant) {
    await db.update(variants).set({ stock: sql`${variants.stock} + ${qty}` }).where(eq(variants.id, variantId));
  }
}

export async function getOrder(db: DB, id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const pays = await db.select().from(payments).where(eq(payments.orderId, id));
  return { ...order, items, payments: pays };
}
