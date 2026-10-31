import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { TRANSITIONS, dashboardStats, listOrders } from "@/server/admin";
import { expireStaleOrders } from "@/server/checkout";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatusButtons } from "./status-buttons";

export const metadata: Metadata = { title: "Panel · Pedidos", robots: { index: false } };

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Esperando pago", paid: "Pagado", preparing: "Preparando", shipped: "Enviado",
  delivered: "Entregado", expired: "Vencido", cancelled: "Cancelado",
};
const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900", paid: "bg-bucare text-white", preparing: "bg-sky-100 text-sky-900",
  shipped: "bg-indigo-100 text-indigo-900", delivered: "bg-fern text-forest", expired: "bg-line text-muted", cancelled: "bg-line text-muted",
};

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const status = estado && estado in STATUS_LABELS ? (estado as OrderStatus) : undefined;
  const db = await getDb();
  await expireStaleOrders(db);
  const [stats, orders] = await Promise.all([dashboardStats(db), listOrders(db, { status })]);

  const cards = [
    { label: "Ventas confirmadas", value: formatUSD(stats.revenue), hint: `${stats.paidCount} ${stats.paidCount === 1 ? "pedido" : "pedidos"}` },
    { label: "Por preparar", value: stats.toPrepare, hint: "Pagados sin despachar" },
    { label: "Esperando pago", value: stats.pending, hint: "Con stock reservado" },
    { label: "Stock bajo", value: stats.lowStock, hint: "Variantes con 3 o menos", href: "/admin/productos" },
  ];

  return (
    <>
      <h1 className="font-display text-4xl">Pedidos</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => {
          const inner = (<><p className="text-sm text-muted">{c.label}</p><p className="mt-1 font-display text-3xl tabular-nums">{c.value}</p><p className="mt-1 text-xs text-muted">{c.hint}</p></>);
          return c.href
            ? <Link key={c.label} href={c.href} className="rounded-3xl bg-surface p-5 hover:ring-2 hover:ring-fern">{inner}</Link>
            : <div key={c.label} className="rounded-3xl bg-surface p-5">{inner}</div>;
        })}
      </div>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        <Link href="/admin" className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", !status ? "border-forest bg-forest text-mist" : "border-forest/20")}>Todos</Link>
        {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(s => (
          <Link key={s} href={`/admin?estado=${s}`} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", status === s ? "border-forest bg-forest text-mist" : "border-forest/20")}>{STATUS_LABELS[s]}</Link>
        ))}
      </nav>

      <div className="mt-4 overflow-x-auto rounded-3xl bg-surface">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-muted">No hay pedidos {status ? "con este estado" : "todavía"}. Haz una compra de prueba en la tienda para verla aquí.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr><th className="px-5 py-3 font-medium">Pedido</th><th className="px-3 py-3 font-medium">Cliente</th><th className="px-3 py-3 font-medium">Productos</th><th className="px-3 py-3 font-medium">Total</th><th className="px-3 py-3 font-medium">Estado</th><th className="px-3 py-3 font-medium">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map(o => (
                <tr key={o.id} className="align-top">
                  <td className="px-5 py-4">
                    <Link href={`/pedido/${o.id}`} target="_blank" className="font-semibold hover:underline">#{o.number}</Link>
                    <p className="text-xs text-muted">{o.createdAt.toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Caracas" })}</p>
                  </td>
                  <td className="px-3 py-4"><p className="font-medium">{o.name}</p><p className="text-xs text-muted">{o.shippingMethod === "retiro" ? "Retiro" : `${o.address?.city}, ${o.address?.state}`}</p></td>
                  <td className="px-3 py-4 text-xs">{o.items.map(i => <p key={i.id}>{i.quantity} × {i.productName} {i.weightGrams >= 1000 ? "1 kg" : `${i.weightGrams} g`}</p>)}</td>
                  <td className="px-3 py-4 font-semibold tabular-nums">{formatUSD(o.totalCents)}</td>
                  <td className="px-3 py-4"><span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[o.status])}>{STATUS_LABELS[o.status]}</span></td>
                  <td className="px-3 py-4"><StatusButtons orderId={o.id} options={TRANSITIONS[o.status] ?? []} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
