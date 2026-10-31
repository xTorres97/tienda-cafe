import { eq } from "drizzle-orm";
import type { DB } from "@/db/types";
import { orders, payments } from "@/db/schema";
import { ShopError } from "../errors";
import { newId } from "../ids";
import type { CardInput, PaymentProvider, PaymentResult } from "./provider";
import { TEST_CARDS, cardBrand, luhn } from "./test-cards";
import { handlePaymentWebhook, signPayload, webhookSecret, type PaymentEvent } from "./webhook";

async function loadPayable(db: DB, paymentId: string, now: Date) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment) throw new ShopError("payment_not_found", "No encontramos este pago");
  const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId));
  if (!order) throw new ShopError("order_not_found", "No encontramos el pedido");
  if (order.status !== "pending_payment") throw new ShopError("order_not_payable", "Este pedido ya no se puede pagar", { status: order.status });
  if (order.reservedUntil <= now) throw new ShopError("order_expired", "La reserva venció. Vuelve a hacer el pedido.");
  return { payment, order };
}

/** Envía el webhook firmado, tal como lo haría la pasarela real contra /api/webhooks/pagos. */
async function emit(db: DB, type: PaymentEvent["type"], payment: { id: string; orderId: string; amountCents: number }, now: Date, failureCode?: string) {
  const event: PaymentEvent = {
    id: newId("evt"),
    type,
    created: Math.floor(now.getTime() / 1000),
    data: { paymentId: payment.id, orderId: payment.orderId, amountCents: payment.amountCents, failureCode },
  };
  const body = JSON.stringify(event);
  await handlePaymentWebhook(db, body, signPayload(body, webhookSecret(), event.created), now);
}

async function settle(db: DB, payment: { id: string; orderId: string; amountCents: number }, result: PaymentResult, now: Date): Promise<PaymentResult> {
  if (result.status === "succeeded") {
    await db.update(payments).set({ status: "succeeded", failureCode: null, updatedAt: now }).where(eq(payments.id, payment.id));
    await emit(db, "payment.succeeded", payment, now);
  } else if (result.status === "failed") {
    await db.update(payments).set({ status: "failed", failureCode: result.failureCode, updatedAt: now }).where(eq(payments.id, payment.id));
    await emit(db, "payment.failed", payment, now, result.failureCode);
  } else {
    await db.update(payments).set({ status: "requires_action", updatedAt: now }).where(eq(payments.id, payment.id));
  }
  return result;
}

export const simulatedProvider: PaymentProvider = {
  name: "simulado",

  async pay(db, paymentId, card: CardInput, now = new Date()) {
    const { payment } = await loadPayable(db, paymentId, now);
    if (payment.status === "succeeded") return { status: "succeeded" };

    const number = card.number.replace(/\D/g, "");
    if (!luhn(number)) throw new ShopError("card_invalid", "El número de tarjeta no es válido", { field: "number" });
    const expiry = new Date(card.expYear < 100 ? 2000 + card.expYear : card.expYear, card.expMonth, 1);
    if (card.expMonth < 1 || card.expMonth > 12 || expiry <= now) throw new ShopError("card_invalid", "La fecha de vencimiento no es válida", { field: "exp" });
    if (!/^\d{3,4}$/.test(card.cvc)) throw new ShopError("card_invalid", "El código de seguridad no es válido", { field: "cvc" });

    await db.update(payments).set({ cardBrand: cardBrand(number), cardLast4: number.slice(-4) }).where(eq(payments.id, paymentId));

    const outcome = TEST_CARDS.find(c => c.number === number)?.outcome ?? "card_declined";
    const result: PaymentResult =
      outcome === "succeeded" ? { status: "succeeded" }
      : outcome === "requires_action" ? { status: "requires_action" }
      : { status: "failed", failureCode: outcome };
    return settle(db, payment, result, now);
  },

  async confirmAction(db, paymentId, approved, now = new Date()) {
    const { payment } = await loadPayable(db, paymentId, now);
    if (payment.status !== "requires_action") throw new ShopError("order_not_payable", "Este pago no espera verificación");
    return settle(db, payment, approved ? { status: "succeeded" } : { status: "failed", failureCode: "authentication_failed" }, now);
  },
};
