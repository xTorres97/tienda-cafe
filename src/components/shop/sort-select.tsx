"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "destacados", label: "Destacados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "altitud", label: "Mayor altitud" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Ordenar</span>
      <select
        value={params.get("orden") ?? "destacados"}
        onChange={e => {
          const next = new URLSearchParams(params);
          if (e.target.value === "destacados") next.delete("orden"); else next.set("orden", e.target.value);
          router.push(`${pathname}?${next}`, { scroll: false });
        }}
        className="h-10 rounded-full border border-forest/20 bg-surface px-4 pr-8 font-medium"
      >
        {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
