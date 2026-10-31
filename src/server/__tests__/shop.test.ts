import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { DB } from "@/db/types";
import { orders, payments, products, variants } from "@/db/schema";
import { createOrder, expireStaleOrders, getOrder } from "../checkout";
import { simulatedProvider } from "../payments/simulated";
import { handlePaymentWebhook, signPayload, verifySignature, webhookSecret } from "../payments/webhook";
import { luhn } from "../payments/test-cards";
import { setOrderStatus } from "../admin";
import { listProducts } from "../catalog";
import { ShopError } from "../errors";
import { testDb } from "./db";

let db: DB;
const now = new Date("2026-10-31T12:00:00Z");
const customer = { name: "Ana Pérez", email: "Ana@Example.com", phone: "0414 555 0123", shippingMethod: "retiro" as const };
const card = (number: string) => ({ number, expMonth: 12, expYear: 2030, cvc: "123", name: "Ana Pérez" });

async function variantOf(slug: string, grams: number) {
  const [p] = await db.select().from(products).where(eq(products.slug, slug));
  const [v] = await db.select().from(variants).where(eq(variants.productId, p.id));
  const all = await db.select().from(variants).where(eq(variants.productId, p.id));
  return all.find(x => x.weightGrams === grams) ?? v;
}
const stockOf = async (id: number) => (await db.select().from(variants).where(eq(variants.id, id)))[0].stock;
const statusOf = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0].status;

beforeEach(async () => { db = await testDb(); });

describe("catálogo", () => {
  it("filtra por región y busca por notas de cata sin importar mayúsculas", async () => {
    expect((await listProducts(db, { region: "Lara" })).map(p => p.slug)).toEqual(["sanare-lavado", "villanueva-descafeinado"]);
    expect((await listProducts(db, { q: "FRESA" })).map(p => p.slug)).toEqual(["bocono-natural"]);
  });
  it("ordena por precio usando la variante más barata", async () => {
    const list = await listProducts(db, { sort: "precio-asc" });
    expect(list[0].slug).toBe("biscucuy");
  });
});

describe("checkout", () => {
  it("calcula el total con precios de la base y reserva stock", async () => {
    const v = await variantOf("sanare-lavado", 250);
    const before = await stockOf(v.id);
    const { order } = await createOrder(db, { ...customer, items: [{ variantId: v.id, grind: "grano", quantity: 2 }] }, now);
    expect(order.subtotalCents).toBe(2 * v.priceCents);
    expect(order.shippingCents).toBe(0);
    expect(order.email).toBe("ana@example.com");
    expect(await stockOf(v.id)).toBe(before - 2);
  });

  it("cobra envío por debajo de $40 y lo regala desde $40", async () => {
    const v = await variantOf("biscucuy", 250);
    const addr = { line1: "Av. Principal, casa 12", city: "Barquisimeto", state: "Lara" };
    const a = await createOrder(db, { ...customer, shippingMethod: "envio", address: addr, items: [{ variantId: v.id, grind: "media", quantity: 1 }] }, now);
    expect(a.order.shippingCents).toBe(500);
    const b = await createOrder(db, { ...customer, shippingMethod: "envio", address: addr, items: [{ variantId: v.id, grind: "media", quantity: 5 }] }, now);
    expect(b.order.shippingCents).toBe(0);
  });

  it("rechaza si no hay stock y no deja nada a medias", async () => {
    const empty = await variantOf("caripe", 250); // stock 0
    const ok = await variantOf("sanare-lavado", 250);
    const before = await stockOf(ok.id);
    await expect(createOrder(db, { ...customer, items: [
      { variantId: ok.id, grind: "grano", quantity: 1 },
      { variantId: empty.id, grind: "grano", quantity: 1 },
    ] }, now)).rejects.toMatchObject({ code: "out_of_stock" });
    expect(await stockOf(ok.id)).toBe(before);
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("no vende de más cuando dos compras piden las últimas unidades", async () => {
    const v = await variantOf("galipan", 500); // stock 3
    const buy = () => createOrder(db, { ...customer, items: [{ variantId: v.id, grind: "grano", quantity: 2 }] }, now);
    const results = await Promise.allSettled([buy(), buy()]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf(v.id)).toBe(1);
  });

  it("exige dirección para envíos y valida el teléfono", async () => {
    const v = await variantOf("sanare-lavado", 250);
    await expect(createOrder(db, { ...customer, shippingMethod: "envio", items: [{ variantId: v.id, grind: "grano", quantity: 1 }] }, now))
      .rejects.toMatchObject({ code: "invalid_input" });
    await expect(createOrder(db, { ...customer, phone: "abc", items: [{ variantId: v.id, grind: "grano", quantity: 1 }] }, now))
      .rejects.toMatchObject({ code: "invalid_input" });
  });

  it("libera el stock de pedidos sin pagar cuando vence la reserva", async () => {
    const v = await variantOf("rubio-honey", 250);
    const before = await stockOf(v.id);
    const { order } = await createOrder(db, { ...customer, items: [{ variantId: v.id, grind: "grano", quantity: 3 }] }, now);
    expect(await expireStaleOrders(db, new Date(now.getTime() + 10 * 60_000))).toBe(0);
    expect(await expireStaleOrders(db, new Date(now.getTime() + 16 * 60_000))).toBe(1);
    expect(await statusOf(order.id)).toBe("expired");
    expect(await stockOf(v.id)).toBe(before);
    expect(await expireStaleOrders(db, new Date(now.getTime() + 20 * 60_000))).toBe(0);
  });
});

describe("pasarela simulada", () => {
  async function newOrder() {
    const v = await variantOf("sanare-lavado", 500);
    return createOrder(db, { ...customer, items: [{ variantId: v.id, grind: "espresso", quantity: 1 }] }, now);
  }

  it("aprueba con 4242 y marca el pedido como pagado vía webhook", async () => {
    const { order, payment } = await newOrder();
    expect(await simulatedProvider.pay(db, payment.id, card("4242 4242 4242 4242"), now)).toEqual({ status: "succeeded" });
    const full = await getOrder(db, order.id);
    expect(full?.status).toBe("paid");
    expect(full?.payments[0]).toMatchObject({ status: "succeeded", cardLast4: "4242", cardBrand: "visa" });
  });

  it("un rechazo deja el pedido pendiente y permite reintentar", async () => {
    const { order, payment } = await newOrder();
    expect(await simulatedProvider.pay(db, payment.id, card("4000000000009995"), now)).toEqual({ status: "failed", failureCode: "insufficient_funds" });
    expect(await statusOf(order.id)).toBe("pending_payment");
    expect(await simulatedProvider.pay(db, payment.id, card("4242424242424242"), now)).toEqual({ status: "succeeded" });
    expect(await statusOf(order.id)).toBe("paid");
  });

  it("verificación del banco: aprobar o rechazar", async () => {
    const a = await newOrder();
    expect((await simulatedProvider.pay(db, a.payment.id, card("4000000000003220"), now)).status).toBe("requires_action");
    expect(await statusOf(a.order.id)).toBe("pending_payment");
    expect(await simulatedProvider.confirmAction(db, a.payment.id, true, now)).toEqual({ status: "succeeded" });
    expect(await statusOf(a.order.id)).toBe("paid");

    const b = await newOrder();
    await simulatedProvider.pay(db, b.payment.id, card("4000000000003220"), now);
    expect(await simulatedProvider.confirmAction(db, b.payment.id, false, now)).toEqual({ status: "failed", failureCode: "authentication_failed" });
  });

  it("valida número (Luhn), vencimiento y CVC", async () => {
    const { payment } = await newOrder();
    await expect(simulatedProvider.pay(db, payment.id, card("4242424242424241"), now)).rejects.toMatchObject({ code: "card_invalid", details: { field: "number" } });
    await expect(simulatedProvider.pay(db, payment.id, { ...card("4242424242424242"), expYear: 2025 }, now)).rejects.toMatchObject({ details: { field: "exp" } });
    await expect(simulatedProvider.pay(db, payment.id, { ...card("4242424242424242"), cvc: "1" }, now)).rejects.toMatchObject({ details: { field: "cvc" } });
    expect(luhn("4000 0000 0000 0002")).toBe(true);
  });

  it("no cobra un pedido cuya reserva venció", async () => {
    const { payment } = await newOrder();
    await expect(simulatedProvider.pay(db, payment.id, card("4242424242424242"), new Date(now.getTime() + 20 * 60_000)))
      .rejects.toMatchObject({ code: "order_expired" });
  });
});

describe("webhook", () => {
  it("rechaza firmas inválidas o viejas", async () => {
    const body = JSON.stringify({ id: "evt_x", type: "payment.succeeded", created: 0, data: { paymentId: "p", orderId: "o", amountCents: 1 } });
    const t = Math.floor(now.getTime() / 1000);
    expect(verifySignature(body, signPayload(body, webhookSecret(), t), webhookSecret(), t)).toBe(true);
    expect(verifySignature(body, signPayload(body, "otro-secreto", t), webhookSecret(), t)).toBe(false);
    expect(verifySignature(body, signPayload(body, webhookSecret(), t - 600), webhookSecret(), t)).toBe(false);
    await expect(handlePaymentWebhook(db, body, "t=1,v1=abc", now)).rejects.toBeInstanceOf(ShopError);
  });

  it("es idempotente: el mismo evento dos veces no se procesa dos veces", async () => {
    const v = await variantOf("sanare-lavado", 250);
    const { order, payment } = await createOrder(db, { ...customer, items: [{ variantId: v.id, grind: "grano", quantity: 1 }] }, now);
    const body = JSON.stringify({ id: "evt_repetido", type: "payment.succeeded", created: 0, data: { paymentId: payment.id, orderId: order.id, amountCents: order.totalCents } });
    const sig = signPayload(body, webhookSecret(), Math.floor(now.getTime() / 1000));
    expect((await handlePaymentWebhook(db, body, sig, now)).duplicate).toBe(false);
    expect((await handlePaymentWebhook(db, body, sig, now)).duplicate).toBe(true);
    expect(await statusOf(order.id)).toBe("paid");
  });
});

describe("panel", () => {
  it("sigue el flujo de estados y repone stock al cancelar", async () => {
    const v = await variantOf("bocono-natural", 250);
    const before = await stockOf(v.id);
    const { order, payment } = await createOrder(db, { ...customer, items: [{ variantId: v.id, grind: "grano", quantity: 2 }] }, now);
    await simulatedProvider.pay(db, payment.id, card("4242424242424242"), now);
    await expect(setOrderStatus(db, order.id, "delivered", now)).rejects.toMatchObject({ code: "invalid_transition" });
    await setOrderStatus(db, order.id, "preparing", now);
    await setOrderStatus(db, order.id, "cancelled", now);
    expect(await stockOf(v.id)).toBe(before);
    const [p] = await db.select().from(payments).where(eq(payments.orderId, order.id));
    expect(p.status).toBe("succeeded");
  });
});
