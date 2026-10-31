"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@/db/schema";
import { setStatusAction } from "./actions";

const LABELS: Partial<Record<OrderStatus, string>> = { preparing: "Preparar", shipped: "Marcar enviado", delivered: "Marcar entregado", cancelled: "Cancelar" };

export function StatusButtons({ orderId, options }: { orderId: string; options: OrderStatus[] }) {
  const [pending, start] = useTransition();
  if (!options.length) return <span className="text-sm text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} disabled={pending}
          onClick={() => start(async () => {
            if (o === "cancelled" && !confirm("¿Cancelar el pedido? El stock vuelve al inventario.")) return;
            const r = await setStatusAction(orderId, o);
            toast(r.error ?? "Pedido actualizado");
          })}
          className={o === "cancelled"
            ? "rounded-full px-3 py-1.5 text-xs font-semibold text-bucare-dark hover:bg-bucare/10"
            : "rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-mist hover:bg-moss disabled:opacity-50"}>
          {LABELS[o]}
        </button>
      ))}
    </div>
  );
}
