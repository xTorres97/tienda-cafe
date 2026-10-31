"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/tienda", label: "Tienda" },
  { href: "/#origenes", label: "Orígenes" },
  { href: "/#como-funciona", label: "Envíos" },
];

export function Header() {
  const pathname = usePathname();
  const lines = useCart(s => s.lines);
  const hydrated = useCart(s => s.hydrated);
  const setOpen = useCart(s => s.setOpen);
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-mist/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Logo />
        <nav aria-label="Principal" className="ml-auto hidden items-center gap-1 sm:flex">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={cn("rounded-full px-3.5 py-2 text-[15px] font-medium hover:bg-fern/60", pathname === n.href && "bg-fern")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => setOpen(true)}
          className="relative ml-auto flex size-11 items-center justify-center rounded-full hover:bg-fern/60 sm:ml-0"
          aria-label={`Carrito, ${count} ${count === 1 ? "producto" : "productos"}`}
        >
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-bucare px-1 text-[11px] font-bold leading-5 text-white tabular-nums">
              {count}
            </span>
          )}
        </button>
      </div>
      <nav aria-label="Principal móvil" className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className="shrink-0 rounded-full bg-fern/50 px-3 py-1.5 text-sm font-medium">{n.label}</Link>
        ))}
      </nav>
    </header>
  );
}
