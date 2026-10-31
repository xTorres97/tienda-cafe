import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search, X } from "lucide-react";
import { getDb } from "@/db";
import { listProducts, listRegions, type CatalogFilters } from "@/server/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { PROCESS_LABELS, ROAST_LABELS } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Todos nuestros cafés de especialidad: filtra por región, tueste y proceso.",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters: CatalogFilters = {
    region: one(sp.region),
    roast: one(sp.tueste) as CatalogFilters["roast"],
    process: one(sp.proceso) as CatalogFilters["process"],
    q: one(sp.q),
    sort: one(sp.orden) as CatalogFilters["sort"],
  };
  if (filters.roast && !(filters.roast in ROAST_LABELS)) filters.roast = undefined;
  if (filters.process && !(filters.process in PROCESS_LABELS)) filters.process = undefined;

  const db = await getDb();
  const [products, regions] = await Promise.all([listProducts(db, filters), listRegions(db)]);

  /** Enlace que activa o quita un filtro manteniendo los demás */
  const href = (key: string, value?: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) { const x = one(v); if (x && k !== key) next.set(k, x); }
    if (value && one(sp[key]) !== value) next.set(key, value);
    const qs = next.toString();
    return qs ? `/tienda?${qs}` : "/tienda";
  };
  const active = (key: string, value: string) => one(sp[key]) === value;
  const anyFilter = filters.region || filters.roast || filters.process || filters.q;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
      <h1 className="font-display text-5xl">Nuestros cafés</h1>
      <p className="mt-3 max-w-xl text-muted">Cada café viene en 250 g, 500 g o 1 kg, en grano o molido para tu método.</p>

      <div className="mt-8 space-y-4 border-y border-line py-5">
        <form action="/tienda" className="relative max-w-md" role="search">
          {Object.entries(sp).filter(([k]) => k !== "q").map(([k, v]) => one(v) && <input key={k} type="hidden" name={k} value={one(v)} />)}
          <Search className="pointer-events-none absolute left-4 top-3 size-4 text-muted" aria-hidden />
          <input name="q" defaultValue={filters.q} placeholder="Busca por nombre, región o sabor (ej. chocolate)" aria-label="Buscar cafés"
            className="h-10 w-full rounded-full border border-forest/20 bg-surface pl-10 pr-4 text-[15px] placeholder:text-muted/70 focus:border-forest focus:outline-none" />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Región</span>
          {regions.map(r => <Chip key={r} href={href("region", r)} active={active("region", r)} label={r} />)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Tueste</span>
          {Object.entries(ROAST_LABELS).map(([k, l]) => <Chip key={k} href={href("tueste", k)} active={active("tueste", k)} label={l.replace("Tueste ", "")} />)}
          <span className="ml-3 mr-1 text-sm text-muted">Proceso</span>
          {Object.entries(PROCESS_LABELS).map(([k, l]) => <Chip key={k} href={href("proceso", k)} active={active("proceso", k)} label={l} />)}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {products.length} {products.length === 1 ? "café" : "cafés"}
          {anyFilter && <Link href="/tienda" className="ml-3 inline-flex items-center gap-1 font-medium text-forest hover:underline"><X className="size-3.5" />Quitar filtros</Link>}
        </p>
        <Suspense><SortSelect /></Suspense>
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-[28px] bg-surface p-10 text-center">
          <p className="font-display text-2xl">Ningún café coincide con esos filtros.</p>
          <p className="mt-2 text-muted">Prueba con otra región o quita algún filtro.</p>
          <Link href="/tienda" className="mt-5 inline-block font-semibold underline">Ver todos los cafés</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} scroll={false} aria-pressed={active}
      className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active ? "border-forest bg-forest text-mist" : "border-forest/20 hover:border-forest/50")}>
      {label}
    </Link>
  );
}
