import Link from "next/link";
import type { ProductWithVariants } from "@/server/catalog";
import { ROAST_LABELS, formatUSD } from "@/lib/money";
import { BagArt } from "./bag-art";

export function ProductCard({ p, priority }: { p: ProductWithVariants; priority?: boolean }) {
  const min = Math.min(...p.variants.map(v => v.priceCents));
  const stock = p.variants.reduce((n, v) => n + v.stock, 0);
  return (
    <Link href={`/producto/${p.slug}`} className="group flex flex-col" data-priority={priority || undefined}>
      <div className="relative flex aspect-[4/5] items-end justify-center overflow-hidden rounded-[28px] bg-fern/60 px-6 pt-6 transition-colors group-hover:bg-fern">
        <BagArt slug={p.slug} name={p.name} region={p.region} altitude={p.altitude} palette={p.palette}
          className="w-[78%] max-w-[260px] translate-y-3 transition-transform duration-300 group-hover:-translate-y-0" />
        {stock === 0 && <span className="absolute left-4 top-4 rounded-full bg-forest px-3 py-1 text-xs font-semibold text-mist">Agotado</span>}
        {stock > 0 && stock <= 10 && <span className="absolute left-4 top-4 rounded-full bg-surface px-3 py-1 text-xs font-semibold">Pocas unidades</span>}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3 px-1">
        <h3 className="font-display text-xl leading-tight">{p.name}</h3>
        <span className="shrink-0 text-sm text-muted">desde <strong className="text-base text-forest tabular-nums">{formatUSD(min)}</strong></span>
      </div>
      <p className="mt-1 px-1 text-sm text-muted">{p.region} · {p.altitude.toLocaleString("es-VE")} m · {ROAST_LABELS[p.roast]}</p>
      <p className="mt-2 px-1 text-sm">{p.notes.join(", ")}</p>
    </Link>
  );
}
