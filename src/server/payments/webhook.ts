import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/types";
import { orders, payments, webhookEvents } from "@/db/schema";
import { ShopError } from "../errors";

export type PaymentEvent = {
  id: string;
  type: "payment.succeeded" | "payment.failed";
  created: number;
  data: { paymentId: string; orderId: string; amountCents: number; failureCode?: string };
};

const TOLERANCE_SECONDS = 300;

export function webhookSecret() {
  return process.env.PAYMENTS_WEBHOOK_SECRET ?? "whsec_desarrollo_local";
}

/** Firma con el formato `t=<timestamp>,v1=<hmac>` (el mismo esquema que Stripe). */
export function signPayload(body: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

export function verifySignature(body: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  const given = Buffer.from(parts.v1);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Procesa un webhook de pago. Verifica la firma, ignora eventos repetidos
 * y solo marca como pagado un pedido que sigue pendiente.
 */
export async function handlePaymentWebhook(db: DB, body: string, signature: string | null, now = new Date()) {
  if (!verifySignature(body, signature, webhookSecret(), Math.floor(now.getTime() / 1000))) {
    throw new ShopError("invalid_signature", "Firma de webhook inválida");
  }
  const event = JSON.parse(body) as PaymentEvent;

  return db.transaction(async tx => {
    const inserted = await tx
      .insert(webhookEvents)
      .values({ id: event.id, type: event.type, paymentId: event.data.paymentId, receivedAt: now })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    if (inserted.length === 0) return { duplicate: true as const };

    if (event.type === "payment.succeeded") {
      await tx
        .update(orders)
        .set({ status: "paid", paidAt: now, updatedAt: now })
        .where(and(eq(orders.id, event.data.orderId), eq(orders.status, "pending_payment")));
    }
    // En un pago fallido el pedido sigue pendiente: se puede reintentar hasta que venza la reserva.
    await tx.update(payments).set({ updatedAt: now }).where(eq(payments.id, event.data.paymentId));
    return { duplicate: false as const, type: event.type };
  });
}
