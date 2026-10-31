import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { expireStaleOrders, getOrder } from "@/server/checkout";
import { formatUSD } from "@/lib/money";
import { PayForm } from "./pay-form";

export const metadata: Metadata = { title: "Pago", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await expireStaleOrders(db);
  const [payment] = await db.select().from(payments).where(eq(payments.id, id));
  if (!payment) notFound();
  const order = await getOrder(db, payment.orderId);
  if (!order) notFound();
  if (order.status !== "pending_payment") redirect(`/pedido/${order.id}`);

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10 font-sans text-slate-800">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link href="/checkout" className="text-slate-500 hover:text-slate-800">← Volver a la tienda</Link>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Modo prueba</span>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pagar a Sombra de Bucare</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{formatUSD(order.totalCents)}</p>
          <p className="mt-1 text-sm text-slate-500">Pedido #{order.number} · {order.items.reduce((n, i) => n + i.quantity, 0)} productos</p>
          <hr className="my-5 border-slate-200" />
          <PayForm paymentId={payment.id} orderId={order.id} amountCents={order.totalCents} reservedUntil={order.reservedUntil.toISOString()} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Pasarela simulada para el portafolio. No se procesa dinero real ni se guardan datos de tarjetas.</p>
      </div>
    </div>
  );
}
