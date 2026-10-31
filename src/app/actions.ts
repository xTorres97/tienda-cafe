"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { createOrder } from "@/server/checkout";
import { ShopError } from "@/server/errors";
import { simulatedProvider } from "@/server/payments/simulated";
import { FAILURE_MESSAGES } from "@/server/payments/test-cards";

export type CheckoutState = { error?: string; fields?: Record<string, string>; variantId?: number } | null;

export async function checkoutAction(_prev: CheckoutState, payload: unknown): Promise<CheckoutState> {
  let paymentId: string;
  try {
    const { payment } = await createOrder(await getDb(), payload);
    paymentId = payment.id;
  } catch (e) {
    if (e instanceof ShopError) {
      return {
        error: e.message,
        fields: (e.details?.fields as Record<string, string>) ?? undefined,
        variantId: e.details?.variantId as number | undefined,
      };
    }
    console.error(e);
    return { error: "No pudimos crear el pedido. Intenta de nuevo en un momento." };
  }
  redirect(`/pago/${paymentId}`);
}

export type PayState =
  | { status: "idle" }
  | { status: "requires_action" }
  | { status: "failed"; message: string; field?: string }
  | { status: "succeeded"; orderId: string };

export async function payAction(paymentId: string, orderId: string, card: { number: string; exp: string; cvc: string; name: string }): Promise<PayState> {
  const [mm, yy] = card.exp.split("/").map(s => Number(s.trim()));
  try {
    const r = await simulatedProvider.pay(await getDb(), paymentId, {
      number: card.number, expMonth: mm || 0, expYear: yy || 0, cvc: card.cvc.trim(), name: card.name,
    });
    if (r.status === "succeeded") return { status: "succeeded", orderId };
    if (r.status === "requires_action") return { status: "requires_action" };
    return { status: "failed", message: FAILURE_MESSAGES[r.failureCode] ?? "El pago fue rechazado." };
  } catch (e) {
    if (e instanceof ShopError) return { status: "failed", message: e.message, field: e.details?.field as string | undefined };
    console.error(e);
    return { status: "failed", message: "La pasarela no respondió. Intenta de nuevo." };
  }
}

export async function confirmAction(paymentId: string, orderId: string, approved: boolean): Promise<PayState> {
  try {
    const r = await simulatedProvider.confirmAction(await getDb(), paymentId, approved);
    if (r.status === "succeeded") return { status: "succeeded", orderId };
    return { status: "failed", message: FAILURE_MESSAGES[r.status === "failed" ? r.failureCode : ""] ?? "No se pudo verificar el pago." };
  } catch (e) {
    if (e instanceof ShopError) return { status: "failed", message: e.message };
    return { status: "failed", message: "La pasarela no respondió. Intenta de nuevo." };
  }
}
