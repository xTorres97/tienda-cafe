"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cartSubtotal, useCart } from "@/lib/cart";
import { FREE_SHIPPING_FROM_CENTS, GRIND_LABELS, formatUSD } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { BagArt } from "./bag-art";
import { QtyStepper } from "./qty";

export function CartSheet() {
  const open = useCart(s => s.open);
  const setOpen = useCart(s => s.setOpen);
  const lines = useCart(s => s.lines);
  const setQty = useCart(s => s.setQty);
  const remove = useCart(s => s.remove);
  const subtotal = cartSubtotal(lines);
  const missing = Math.max(0, FREE_SHIPPING_FROM_CENTS - subtotal);

  useEffect(() => {
    // Si el almacenamiento está bloqueado (modo privado), el carrito funciona igual en memoria
    Promise.resolve(useCart.persist.rehydrate()).finally(() => useCart.setState({ hydrated: true }));
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-forest/40 data-[state=open]:animate-[fade-in_150ms]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-mist shadow-2xl data-[state=open]:animate-[sheet-in_200ms_cubic-bezier(.2,.8,.2,1)]">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="font-display text-2xl">Tu carrito</Dialog.Title>
            <Dialog.Close className="flex size-10 items-center justify-center rounded-full hover:bg-fern" aria-label="Cerrar carrito"><X className="size-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Productos que agregaste y total del pedido</Dialog.Description>

          {lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="text-muted">Tu carrito está vacío. Elige un café por región, tueste o notas de cata.</p>
              <Button asChild variant="forest" onClick={() => setOpen(false)}><Link href="/tienda">Ver los cafés</Link></Button>
            </div>
          ) : (
            <>
              <div className="border-b border-line px-5 py-3 text-sm">
                {missing > 0 ? <p>Te faltan <strong>{formatUSD(missing)}</strong> para el envío gratis.</p> : <p className="font-semibold text-moss">Tu pedido tiene envío gratis.</p>}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fern" aria-hidden>
                  <div className="h-full rounded-full bg-moss transition-[width]" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_FROM_CENTS) * 100)}%` }} />
                </div>
              </div>
              <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                {lines.map(l => (
                  <li key={`${l.variantId}-${l.grind}`} className="flex gap-4 py-4">
                    <BagArt slug={l.slug} name={l.name} region={l.region} altitude={l.altitude} palette={l.palette} className="h-24 w-[74px] shrink-0" title={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <Link href={`/producto/${l.slug}`} onClick={() => setOpen(false)} className="font-display text-lg leading-tight hover:underline">{l.name}</Link>
                        <span className="font-semibold tabular-nums">{formatUSD(l.priceCents * l.quantity)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">{l.weightGrams >= 1000 ? "1 kg" : `${l.weightGrams} g`} · {GRIND_LABELS[l.grind]}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <QtyStepper value={l.quantity} onChange={n => setQty(l.variantId, l.grind, n)} label={`Cantidad de ${l.name}`} />
                        <button onClick={() => remove(l.variantId, l.grind)} className="text-sm text-muted underline-offset-2 hover:text-forest hover:underline">Quitar</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-5 py-5">
                <div className="flex justify-between text-lg"><span>Subtotal</span><strong className="tabular-nums">{formatUSD(subtotal)}</strong></div>
                <p className="mt-1 text-sm text-muted">El envío se calcula en el siguiente paso. Retiro en tienda sin costo.</p>
                <Button asChild size="lg" className="mt-4 w-full" onClick={() => setOpen(false)}><Link href="/checkout">Continuar con la compra</Link></Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
