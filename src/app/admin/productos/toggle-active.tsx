"use client";

import { useTransition } from "react";
import { toggleProductAction } from "../actions";

export function ToggleActive({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={active} disabled={pending} onChange={e => start(async () => { await toggleProductAction(id, e.target.checked); })} className="size-4 accent-[var(--moss)]" />
      Visible en la tienda
    </label>
  );
}
