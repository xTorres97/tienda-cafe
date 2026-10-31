"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { confirmAction, payAction, type PayState } from "@/app/actions";
import { TEST_CARDS } from "@/server/payments/test-cards";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";

const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

export function PayForm({ paymentId, orderId, amountCents, reservedUntil }: { paymentId: string; orderId: string; amountCents: number; reservedUntil: string }) {
  const router = useRouter();
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", name: "" });
  const [state, setState] = useState<PayState>({ status: "idle" });
  const [pending, start] = useTransition();
  const left = useCountdown(reservedUntil);

  useEffect(() => {
    if (state.status === "succeeded") router.replace(`/pedido/${state.orderId}?pago=ok`);
  }, [state, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => setState(await payAction(paymentId, orderId, card)));
  };
  const confirm = (approved: boolean) => start(async () => setState(await confirmAction(paymentId, orderId, approved)));

  const expired = left <= 0;
  const field = (f: string) => cn("h-11 w-full rounded-lg border bg-white px-3 text-[15px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
    state.status === "failed" && state.field === f ? "border-red-500" : "border-slate-300");

  return (
    <>
      <div className={cn("mb-5 rounded-lg px-3 py-2 text-sm", expired ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>
        {expired ? "La reserva venció. Vuelve a la tienda para hacer el pedido de nuevo." : <>Tu pedido está reservado por <strong className="tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</strong></>}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="cc-number" className="mb-1 block text-sm font-medium text-slate-700">Número de tarjeta</label>
          <div className="relative">
            <input id="cc-number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card.number}
              onChange={e => setCard(c => ({ ...c, number: fmtCard(e.target.value) }))} className={cn(field("number"), "pl-10 tabular-nums")} />
            <CreditCard className="pointer-events-none absolute left-3 top-3 size-5 text-slate-400" aria-hidden />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cc-exp" className="mb-1 block text-sm font-medium text-slate-700">Vencimiento</label>
            <input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.exp}
              onChange={e => setCard(c => ({ ...c, exp: fmtExp(e.target.value) }))} className={cn(field("exp"), "tabular-nums")} />
          </div>
          <div>
            <label htmlFor="cc-cvc" className="mb-1 block text-sm font-medium text-slate-700">CVC</label>
            <input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={card.cvc}
              onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className={cn(field("cvc"), "tabular-nums")} />
          </div>
        </div>
        <div>
          <label htmlFor="cc-name" className="mb-1 block text-sm font-medium text-slate-700">Nombre en la tarjeta</label>
          <input id="cc-name" autoComplete="cc-name" value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} className={field("name")} />
        </div>

        {state.status === "failed" && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.message}</p>}

        <button type="submit" disabled={pending || expired}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          Pagar {formatUSD(amountCents)}
        </button>
      </form>

      <details className="mt-6 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600" open>
        <summary className="cursor-pointer font-medium text-slate-800">Tarjetas de prueba</summary>
        <p className="mt-2 text-xs">Usa cualquier fecha futura y cualquier CVC de 3 dígitos. Toca una para completarla.</p>
        <ul className="mt-2 space-y-1">
          {TEST_CARDS.map(t => (
            <li key={t.number}>
              <button type="button" onClick={() => setCard({ number: fmtCard(t.number), exp: "12/30", cvc: "123", name: "Cliente de prueba" })}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-slate-100">
                <span className="font-mono text-xs tabular-nums">{fmtCard(t.number)}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      {/* Paso de verificación del banco (como 3-D Secure) */}
      <Dialog.Root open={state.status === "requires_action"}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 text-slate-800 shadow-2xl">
            <ShieldCheck className="size-8 text-indigo-600" aria-hidden />
            <Dialog.Title className="mt-3 text-lg font-semibold">Verificación de tu banco</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              Este es un paso simulado de autenticación. En un pago real, aquí confirmarías la compra en la app de tu banco.
            </Dialog.Description>
            <div className="mt-5 flex gap-2">
              <button onClick={() => confirm(false)} disabled={pending} className="h-11 flex-1 rounded-lg border border-slate-300 font-medium hover:bg-slate-50">Rechazar</button>
              <button onClick={() => confirm(true)} disabled={pending} className="h-11 flex-1 rounded-lg bg-indigo-600 font-semibold text-white hover:bg-indigo-700">Autorizar</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function useCountdown(iso: string) {
  const target = new Date(iso).getTime();
  const [left, setLeft] = useState(() => Math.max(0, Math.round((target - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.round((target - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}
