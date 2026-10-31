import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getDb } from "@/db";
import { expireStaleOrders, getOrder } from "@/server/checkout";
import { GRIND_LABELS, formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

const STEPS = [
  { key: "paid", label: "Pago confirmado" },
  { key: "preparing", label: "Tostando y empacando" },
  { key: "shipped", label: "En camino" },
  { key: "delivered", label: "Entregado" },
] as const;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await expireStaleOrders(db);
  const order = await getOrder(db, id);
  if (!order) notFound();

  const paidLike = ["paid", "preparing", "shipped", "delivered"].includes(order.status);
  const stepIndex = STEPS.findIndex(s => s.key === order.status);
  const payment = order.payments.find(p => p.status === "succeeded") ?? order.payments[0];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
      {paidLike && <ClearCart />}
      <p className="text-sm font-semibold text-moss">Pedido #{order.number}</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">
        {paidLike ? `¡Gracias, ${order.name.split(" ")[0]}!` : order.status === "expired" ? "La reserva venció" : order.status === "cancelled" ? "Pedido cancelado" : "Falta el pago"}
      </h1>
      <p className="mt-3 text-lg text-muted">
        {paidLike ? `Te escribimos a ${order.email} con cada novedad del pedido.`
          : order.status === "expired" ? "No recibimos el pago a tiempo y liberamos el café para otros clientes. Puedes volver a pedirlo."
          : order.status === "cancelled" ? "Este pedido fue cancelado y no se te cobrará."
          : "Tu pedido está reservado. Completa el pago para confirmarlo."}
      </p>
      {order.status === "pending_payment" && payment && <Button asChild size="lg" className="mt-6"><Link href={`/pago/${payment.id}`}>Pagar ahora</Link></Button>}
      {order.status === "expired" && <Button asChild size="lg" className="mt-6" variant="forest"><Link href="/tienda">Volver a la tienda</Link></Button>}

      {paidLike && (
        <ol className="mt-10 grid gap-3 sm:grid-cols-4" aria-label="Estado del pedido">
          {STEPS.map((s, i) => {
            const done = i <= stepIndex;
            return (
              <li key={s.key} className={cn("rounded-2xl p-4", done ? "bg-forest text-mist" : "bg-surface text-muted")} aria-current={i === stepIndex ? "step" : undefined}>
                <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold", done ? "bg-bucare text-white" : "bg-fern")}>
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <p className="mt-3 text-sm font-semibold">{s.label}</p>
              </li>
            );
          })}
        </ol>
      )}

      <section className="mt-10 rounded-[28px] bg-surface p-6">
        <h2 className="font-display text-2xl">Detalle</h2>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map(i => (
            <li key={i.id} className="flex justify-between gap-4 py-3 text-[15px]">
              <span><strong>{i.quantity} ×</strong> {i.productName} · {i.weightGrams >= 1000 ? "1 kg" : `${i.weightGrams} g`} · {GRIND_LABELS[i.grind]}</span>
              <span className="tabular-nums">{formatUSD(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatUSD(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Envío</dt><dd className="tabular-nums">{order.shippingCents ? formatUSD(order.shippingCents) : "Gratis"}</dd></div>
          <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatUSD(order.totalCents)}</dd></div>
        </dl>
        <div className="mt-6 grid gap-6 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">Entrega</p>
            <p className="mt-1 text-muted">
              {order.shippingMethod === "retiro" ? "Retiro en Barquisimeto (te avisamos cuando esté listo)" : `${order.address?.line1}, ${order.address?.city}, ${order.address?.state}`}
            </p>
          </div>
          {payment?.cardLast4 && paidLike && (
            <div>
              <p className="font-semibold">Pago</p>
              <p className="mt-1 capitalize text-muted">{payment.cardBrand} terminada en {payment.cardLast4}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
