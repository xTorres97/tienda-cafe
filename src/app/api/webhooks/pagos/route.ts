// Endpoint para que una pasarela externa notifique pagos (firma HMAC en el encabezado `x-signature`).
// La pasarela simulada usa la misma función internamente.
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ShopError } from "@/server/errors";
import { handlePaymentWebhook } from "@/server/payments/webhook";

export async function POST(req: Request) {
  const body = await req.text();
  try {
    const result = await handlePaymentWebhook(await getDb(), body, req.headers.get("x-signature"));
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    if (e instanceof ShopError && e.code === "invalid_signature") return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("webhook error", e);
    return NextResponse.json({ error: "Error procesando el evento" }, { status: 500 });
  }
}
