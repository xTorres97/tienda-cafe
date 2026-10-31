"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Grind, Product, Variant } from "@/db/schema";
import { useCart } from "@/lib/cart";
import { GRIND_LABELS, formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "./qty";

const weightLabel = (g: number) => (g >= 1000 ? "1 kg" : `${g} g`);

export function AddToCart({ product, variants }: { product: Pick<Product, "slug" | "name" | "region" | "altitude" | "palette">; variants: Variant[] }) {
  const firstAvailable = variants.find(v => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [grind, setGrind] = useState<Grind>("grano");
  const [qty, setQty] = useState(1);
  const add = useCart(s => s.add);
  const inCart = useCart(s => s.lines.filter(l => l.variantId === variantId).reduce((n, l) => n + l.quantity, 0));

  const v = variants.find(x => x.id === variantId)!;
  const available = Math.max(0, v.stock - inCart);
  const soldOut = v.stock === 0;

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (qty > available) { toast(`Solo quedan ${available} disponibles de ${weightLabel(v.weightGrams)}`); return; }
        add({ variantId, grind, quantity: qty, ...product, weightGrams: v.weightGrams, priceCents: v.priceCents });
        setQty(1);
      }}
      className="space-y-6"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tamaño</legend>
        <div className="grid grid-cols-3 gap-2">
          {variants.map(x => (
            <label key={x.id}
              className={cn("relative flex cursor-pointer flex-col items-center rounded-2xl border-2 px-2 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bucare",
                x.id === variantId ? "border-forest bg-surface" : "border-transparent bg-fern/60 hover:bg-fern",
                x.stock === 0 && "opacity-50")}>
              <input type="radio" name="variant" value={x.id} checked={x.id === variantId} onChange={() => { setVariantId(x.id); setQty(1); }} className="sr-only" />
              <span className="font-semibold">{weightLabel(x.weightGrams)}</span>
              <span className="text-sm tabular-nums text-muted">{formatUSD(x.priceCents)}</span>
              {x.stock === 0 && <span className="text-xs font-semibold">Agotado</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="grind" className="mb-2 block text-sm font-semibold">Molienda</label>
        <select id="grind" value={grind} onChange={e => setGrind(e.target.value as Grind)}
          className="h-11 w-full rounded-full border border-forest/20 bg-surface px-4 font-medium">
          {Object.entries(GRIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <QtyStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(10, available))} label="Cantidad" />
        <Button type="submit" size="lg" className="flex-1" disabled={soldOut || available === 0}>
          {soldOut ? "Agotado" : available === 0 ? "Ya tienes todo el stock en el carrito" : `Agregar · ${formatUSD(v.priceCents * qty)}`}
        </Button>
      </div>
      {!soldOut && v.stock <= 5 && <p className="text-sm font-medium text-bucare-dark">Quedan {v.stock} de {weightLabel(v.weightGrams)}.</p>}
    </form>
  );
}
