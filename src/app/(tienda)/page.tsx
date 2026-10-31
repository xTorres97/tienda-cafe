import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Flame, PackageCheck, Truck } from "lucide-react";
import { getDb } from "@/db";
import { listProducts } from "@/server/catalog";
import { BagArt } from "@/components/shop/bag-art";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { FREE_SHIPPING_FROM_CENTS, formatUSD } from "@/lib/money";

export default async function Home() {
  await connection();
  const products = await listProducts(await getDb());
  const featured = products.filter(p => p.featured).slice(0, 3);
  const byAltitude = [...products].sort((a, b) => b.altitude - a.altitude);
  const maxAlt = byAltitude[0]?.altitude ?? 2000;

  return (
    <>
      {/* Hero: las bolsas destacadas en abanico */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-[1.05fr_1fr] md:px-6 md:pt-16">
        <div className="animate-[rise_.6s_ease-out_both]">
          <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.02] tracking-[-0.02em]">
            Café de montaña, tostado esta semana.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Lotes pequeños de fincas venezolanas entre 1.100 y 1.900 metros. Elige el origen, el tueste y cómo lo preparas: lo molemos a tu medida.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/tienda">Ver los cafés <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="#origenes">Conocer los orígenes</Link></Button>
          </div>
        </div>
        <div className="relative mx-auto flex h-[360px] w-full max-w-[460px] items-end justify-center md:h-[440px]" aria-hidden>
          {featured.map((p, i) => (
            <Link key={p.id} href={`/producto/${p.slug}`} tabIndex={-1}
              className="absolute bottom-0 w-[48%] origin-bottom transition-transform duration-300 hover:-translate-y-3"
              style={{ transform: `translateX(${(i - 1) * 62}%) rotate(${(i - 1) * 7}deg)`, zIndex: i === 1 ? 2 : 1 }}>
              <BagArt slug={p.slug} name={p.name} region={p.region} altitude={p.altitude} palette={p.palette} className="w-full drop-shadow-xl" title={false} />
            </Link>
          ))}
        </div>
      </section>

      {/* Orígenes por altitud: el dato que más influye en la taza */}
      <section id="origenes" className="scroll-mt-20 bg-forest py-20 text-mist">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="max-w-xl font-display text-4xl leading-tight">A más altura, el grano madura lento y la taza gana dulzor.</h2>
          <p className="mt-4 max-w-xl text-mist/70">Nuestros cafés ordenados por la altitud de la finca. Toca uno para ver su perfil completo.</p>
          <ol className="mt-12 space-y-2.5">
            {byAltitude.map(p => (
              <li key={p.id}>
                <Link href={`/producto/${p.slug}`} className="group grid grid-cols-[7.5rem_1fr] items-center gap-4 sm:grid-cols-[11rem_1fr_6rem]">
                  <span className="truncate font-display text-lg group-hover:text-white">{p.name}</span>
                  <span className="relative h-9 rounded-full bg-mist/10">
                    <span className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full pr-3 text-xs font-semibold transition-colors"
                      style={{ width: `${(p.altitude / maxAlt) * 100}%`, background: p.palette.paper, color: p.palette.ink }}>
                      {p.region}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-mist/75 sm:block">{p.altitude.toLocaleString("es-VE")} m</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Los más pedidos</h2>
          <Link href="/tienda" className="flex items-center gap-1 font-semibold hover:underline">Ver todos <ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto mt-24 grid max-w-6xl scroll-mt-20 gap-8 px-4 md:grid-cols-3 md:px-6">
        {[
          { icon: Flame, title: "Tostamos los lunes", text: "Cada pedido sale con fecha de tueste de esa semana. El café está en su mejor punto entre 7 y 30 días después." },
          { icon: PackageCheck, title: "Molido a tu manera", text: "En grano, para espresso, colador o prensa francesa. Lo indicas en cada producto." },
          { icon: Truck, title: `Envío gratis desde ${formatUSD(FREE_SHIPPING_FROM_CENTS)}`, text: "Despachos a todo el país en 2 a 4 días hábiles. Retiro sin costo en Barquisimeto." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-[28px] bg-surface p-7">
            <Icon className="size-6 text-bucare" aria-hidden />
            <h3 className="mt-4 font-display text-xl">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
