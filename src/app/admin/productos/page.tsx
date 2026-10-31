import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { products, variants } from "@/db/schema";
import { BagArt } from "@/components/shop/bag-art";
import { VariantRow } from "./variant-row";
import { ToggleActive } from "./toggle-active";

export const metadata: Metadata = { title: "Panel · Productos", robots: { index: false } };

export default async function AdminProducts() {
  const db = await getDb();
  const [ps, vs] = await Promise.all([
    db.select().from(products).orderBy(asc(products.id)),
    db.select().from(variants).orderBy(asc(variants.weightGrams)),
  ]);
  return (
    <>
      <h1 className="font-display text-4xl">Productos</h1>
      <p className="mt-2 text-muted">Ajusta stock y precios por presentación. Las variantes con 3 unidades o menos se marcan en rojo.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {ps.map(p => (
          <section key={p.id} className="flex gap-5 rounded-3xl bg-surface p-5" aria-labelledby={`p-${p.id}`}>
            <BagArt slug={p.slug} name={p.name} region={p.region} altitude={p.altitude} palette={p.palette} className="h-28 w-[86px] shrink-0" title={false} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`p-${p.id}`} className="font-display text-xl">{p.name}</h2>
                <ToggleActive id={p.id} active={p.active} />
              </div>
              <p className="text-sm text-muted">{p.region} · {p.farm}</p>
              <div className="mt-4 space-y-2">{vs.filter(v => v.productId === p.id).map(v => <VariantRow key={v.id} v={v} />)}</div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
