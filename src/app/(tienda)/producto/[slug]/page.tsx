import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db";
import { getProduct, listProducts } from "@/server/catalog";
import { BagArt } from "@/components/shop/bag-art";
import { AddToCart } from "@/components/shop/add-to-cart";
import { ProductCard } from "@/components/shop/product-card";
import { PROCESS_LABELS, ROAST_LABELS } from "@/lib/money";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct(await getDb(), (await params).slug);
  if (!p) return { title: "Café no encontrado" };
  return {
    title: `${p.name}, ${p.region}`,
    description: `${p.description} Notas: ${p.notes.join(", ")}.`,
    alternates: { canonical: `/producto/${p.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const db = await getDb();
  const p = await getProduct(db, slug);
  if (!p) notFound();
  const others = (await listProducts(db)).filter(x => x.id !== p.id && (x.region === p.region || x.roast === p.roast)).slice(0, 3);

  // Datos estructurados para que Google muestre precio y disponibilidad
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Café ${p.name}`,
    description: p.description,
    brand: { "@type": "Brand", name: "Sombra de Bucare" },
    offers: p.variants.map(v => ({
      "@type": "Offer",
      sku: v.sku,
      price: (v.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
  };

  const facts = [
    ["Región", p.region],
    ["Finca", p.farm],
    ["Productor", p.producer],
    ["Altitud", `${p.altitude.toLocaleString("es-VE")} m s. n. m.`],
    ["Variedad", p.variety],
    ["Proceso", PROCESS_LABELS[p.process]],
    ["Tueste", ROAST_LABELS[p.roast].replace("Tueste ", "")],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/tienda" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-forest"><ChevronLeft className="size-4" />Todos los cafés</Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
        <div className="flex items-end justify-center rounded-[32px] px-10 pb-6 pt-12 md:sticky md:top-24 md:self-start" style={{ background: `${p.palette.paper}22` }}>
          <BagArt slug={p.slug} name={p.name} region={p.region} altitude={p.altitude} palette={p.palette} className="w-full max-w-[340px] drop-shadow-2xl" />
        </div>

        <div>
          <p className="text-sm font-semibold text-moss">{p.region} · {p.altitude.toLocaleString("es-VE")} m</p>
          <h1 className="mt-2 font-display text-5xl leading-tight">{p.name}</h1>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Notas de cata">
            {p.notes.map(n => <li key={n} className="rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium">{n}</li>)}
          </ul>
          <p className="mt-6 text-lg leading-relaxed text-muted">{p.description}</p>

          <div className="mt-8 rounded-[28px] bg-surface p-6">
            <AddToCart product={{ slug: p.slug, name: p.name, region: p.region, altitude: p.altitude, palette: p.palette }} variants={p.variants} />
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 text-[15px]">
            {facts.map(([k, v]) => (
              <div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display text-3xl">También te puede gustar</h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{others.map(o => <ProductCard key={o.id} p={o} />)}</div>
        </section>
      )}
    </div>
  );
}
