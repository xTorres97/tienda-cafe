"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BagPalette, Grind } from "@/db/schema";
import { MAX_QTY_PER_LINE } from "./money";

export type CartLine = {
  variantId: number;
  grind: Grind;
  quantity: number;
  // Copia para mostrar el carrito sin ir al servidor; el precio real se recalcula al pagar
  slug: string;
  name: string;
  region: string;
  altitude: number;
  weightGrams: number;
  priceCents: number;
  palette: BagPalette;
};

type CartState = {
  lines: CartLine[];
  open: boolean;
  hydrated: boolean;
  add: (line: CartLine) => void;
  setQty: (variantId: number, grind: Grind, quantity: number) => void;
  remove: (variantId: number, grind: Grind) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

const same = (a: Pick<CartLine, "variantId" | "grind">, b: Pick<CartLine, "variantId" | "grind">) =>
  a.variantId === b.variantId && a.grind === b.grind;

export const useCart = create<CartState>()(
  persist(
    set => ({
      lines: [],
      open: false,
      hydrated: false,
      add: line =>
        set(s => {
          const existing = s.lines.find(l => same(l, line));
          const lines = existing
            ? s.lines.map(l => (same(l, line) ? { ...l, quantity: Math.min(MAX_QTY_PER_LINE, l.quantity + line.quantity) } : l))
            : [...s.lines, line];
          return { lines, open: true };
        }),
      setQty: (variantId, grind, quantity) =>
        set(s => ({
          lines: s.lines.map(l => (same(l, { variantId, grind }) ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY_PER_LINE, quantity)) } : l)),
        })),
      remove: (variantId, grind) => set(s => ({ lines: s.lines.filter(l => !same(l, { variantId, grind })) })),
      clear: () => set({ lines: [] }),
      setOpen: open => set({ open }),
    }),
    {
      name: "sombra-de-bucare:carrito",
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ lines: s.lines }),
      // Se carga después de montar (ver CartSheet) para que el HTML del servidor y el del cliente coincidan
      skipHydration: true,
      onRehydrateStorage: () => () => useCart.setState({ hydrated: true }),
    }
  )
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity * l.priceCents, 0);
