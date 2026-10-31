"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Variant } from "@/db/schema";
import { updateVariantAction } from "../actions";
import { cn } from "@/lib/utils";

export function VariantRow({ v }: { v: Variant }) {
  const [stock, setStock] = useState(String(v.stock));
  const [price, setPrice] = useState((v.priceCents / 100).toFixed(2));
  const [pending, start] = useTransition();
  const dirty = Number(stock) !== v.stock || Math.round(Number(price) * 100) !== v.priceCents;

  return (
    <form className="grid grid-cols-[4rem_1fr_1fr_auto] items-center gap-3"
      onSubmit={e => {
        e.preventDefault();
        start(async () => {
          const r = await updateVariantAction(v.id, Number(stock), Math.round(Number(price) * 100));
          toast(r.error ?? `${v.sku} actualizado`);
        });
      }}>
      <span className="text-sm font-semibold">{v.weightGrams >= 1000 ? "1 kg" : `${v.weightGrams} g`}</span>
      <label className="text-xs text-muted">Stock
        <input type="number" min={0} max={10000} value={stock} onChange={e => setStock(e.target.value)}
          className={cn("mt-0.5 h-9 w-full rounded-xl border bg-surface px-3 text-sm text-forest tabular-nums", v.stock <= 3 ? "border-bucare" : "border-forest/20")} />
      </label>
      <label className="text-xs text-muted">Precio (USD)
        <input type="number" min={1} step="0.5" value={price} onChange={e => setPrice(e.target.value)}
          className="mt-0.5 h-9 w-full rounded-xl border border-forest/20 bg-surface px-3 text-sm text-forest tabular-nums" />
      </label>
      <button disabled={!dirty || pending} className="mt-4 h-9 rounded-full bg-forest px-4 text-xs font-semibold text-mist disabled:opacity-30">Guardar</button>
    </form>
  );
}
