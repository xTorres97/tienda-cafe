"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_QTY_PER_LINE } from "@/lib/money";

export function QtyStepper({ value, onChange, max = MAX_QTY_PER_LINE, label }: { value: number; onChange: (n: number) => void; max?: number; label: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-full border border-forest/20" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className="flex size-9 items-center justify-center rounded-full disabled:opacity-30" aria-label="Quitar uno">
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="flex size-9 items-center justify-center rounded-full disabled:opacity-30" aria-label="Agregar uno">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
