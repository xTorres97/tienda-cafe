import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";
import { CartSheet } from "@/components/shop/cart-sheet";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-mist">Saltar al contenido</a>
      <Header />
      <main id="contenido" className="flex-1">{children}</main>
      <Footer />
      <CartSheet />
    </>
  );
}
