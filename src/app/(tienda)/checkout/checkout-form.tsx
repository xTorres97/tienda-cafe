"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { checkoutAction, type CheckoutState } from "@/app/actions";
import { cartSubtotal, useCart } from "@/lib/cart";
import { GRIND_LABELS, RESERVATION_MINUTES, formatUSD, shippingFor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { BagArt } from "@/components/shop/bag-art";
import { cn } from "@/lib/utils";

const STATES = ["Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", "Yaracuy", "Zulia"];

export function CheckoutForm() {
  const lines = useCart(s => s.lines);
  const hydrated = useCart(s => s.hydrated);
  const [method, setMethod] = useState<"retiro" | "envio">("envio");
  const [state, action, pending] = useActionState<CheckoutState, unknown>(checkoutAction, null);

  if (!hydrated) return <div className="h-96" aria-busy />;
  if (lines.length === 0) {
    return (
      <div className="rounded-[28px] bg-surface p-10 text-center">
        <p className="font-display text-2xl">Tu carrito está vacío.</p>
        <Link href="/tienda" className="mt-4 inline-block font-semibold underline">Elegir un café</Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(lines);
  const shipping = shippingFor(method, subtotal);
  const err = (k: string) => state?.fields?.[k];
  const field = (k: string) => cn("h-12 w-full rounded-2xl border bg-surface px-4 text-[15px] focus:border-forest focus:outline-none", err(k) ? "border-bucare" : "border-forest/20");

  // Envío manual (no <form action>) para que React no limpie los campos si el servidor devuelve un error
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "");
    const payload = {
      items: lines.map(l => ({ variantId: l.variantId, grind: l.grind, quantity: l.quantity })),
      name: s("name"), email: s("email"), phone: s("phone"), shippingMethod: method,
      address: method === "envio" ? { line1: s("line1"), city: s("city"), state: s("state"), notes: s("notes") || undefined } : undefined,
    };
    startTransition(() => action(payload));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="space-y-10">
        <section>
          <h2 className="font-display text-2xl">Tus datos</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">Nombre y apellido</label>
              <input id="name" name="name" autoComplete="name" className={field("name")} aria-invalid={!!err("name")} aria-describedby="name-err" />
              <FieldError id="name-err" msg={err("name")} />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" className={field("email")} aria-invalid={!!err("email")} aria-describedby="email-err" />
              <FieldError id="email-err" msg={err("email")} />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">Teléfono</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0414 555 0123" className={field("phone")} aria-invalid={!!err("phone")} aria-describedby="phone-err" />
              <FieldError id="phone-err" msg={err("phone")} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">Entrega</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Método de entrega">
            {([["envio", "Envío a domicilio", subtotal >= 4000 ? "Gratis" : formatUSD(500)], ["retiro", "Retiro en Barquisimeto", "Gratis"]] as const).map(([v, label, price]) => (
              <label key={v} className={cn("flex cursor-pointer items-center justify-between rounded-2xl border-2 px-5 py-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bucare",
                method === v ? "border-forest bg-surface" : "border-transparent bg-fern/60")}>
                <input type="radio" name="method" className="sr-only" checked={method === v} onChange={() => setMethod(v)} />
                <span className="font-semibold">{label}</span><span className="text-sm text-muted">{price}</span>
              </label>
            ))}
          </div>
          {method === "envio" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="line1" className="mb-1.5 block text-sm font-semibold">Dirección</label>
                <input id="line1" name="line1" autoComplete="street-address" placeholder="Calle, edificio o casa, punto de referencia" className={field("address.line1")} aria-invalid={!!err("address.line1")} />
                {err("address.line1") && <p className="mt-1.5 text-sm text-bucare-dark">{err("address.line1")}</p>}
              </div>
              <div>
                <label htmlFor="city" className="mb-1.5 block text-sm font-semibold">Ciudad</label>
                <input id="city" name="city" autoComplete="address-level2" className={field("address.city")} aria-invalid={!!err("address.city")} />
                {err("address.city") && <p className="mt-1.5 text-sm text-bucare-dark">{err("address.city")}</p>}
              </div>
              <div>
                <label htmlFor="state" className="mb-1.5 block text-sm font-semibold">Estado</label>
                <select id="state" name="state" defaultValue="" className={field("address.state")} aria-invalid={!!err("address.state")}>
                  <option value="" disabled>Elige un estado</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                {err("address.state") && <p className="mt-1.5 text-sm text-bucare-dark">{err("address.state")}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="mb-1.5 block text-sm font-semibold">Indicaciones para la entrega <span className="font-normal text-muted">(opcional)</span></label>
                <input id="notes" name="notes" className={field("address.notes")} />
              </div>
            </div>
          )}
          {err("address") && <p className="mt-3 text-sm text-bucare-dark">{err("address")}</p>}
        </section>
      </div>

      <aside className="h-fit rounded-[28px] bg-surface p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">Resumen</h2>
        <ul className="mt-4 divide-y divide-line">
          {lines.map(l => (
            <li key={`${l.variantId}-${l.grind}`} className={cn("flex gap-3 py-3", state?.variantId === l.variantId && "rounded-xl bg-bucare/10 px-2")}>
              <BagArt slug={l.slug} name={l.name} region={l.region} altitude={l.altitude} palette={l.palette} className="h-16 w-12 shrink-0" title={false} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{l.quantity} × {l.name}</p>
                <p className="text-muted">{l.weightGrams >= 1000 ? "1 kg" : `${l.weightGrams} g`} · {GRIND_LABELS[l.grind]}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatUSD(l.priceCents * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatUSD(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Envío</dt><dd className="tabular-nums">{shipping ? formatUSD(shipping) : "Gratis"}</dd></div>
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatUSD(subtotal + shipping)}</dd></div>
        </dl>
        {state?.error && !state.fields && <p role="alert" className="mt-4 rounded-2xl bg-bucare/10 p-3 text-sm font-medium text-bucare-dark">{state.error}</p>}
        {state?.fields && <p role="alert" className="mt-4 text-sm font-medium text-bucare-dark">Revisa los campos marcados.</p>}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
          {pending ? <><Loader2 className="animate-spin" />Reservando tu pedido…</> : "Ir a pagar"}
        </Button>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted">Reservamos tu café por {RESERVATION_MINUTES} minutos mientras completas el pago.</p>
      </aside>
    </form>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={id} className="mt-1.5 text-sm text-bucare-dark">{msg}</p> : null;
}
