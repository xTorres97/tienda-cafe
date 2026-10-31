import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
      <h1 className="font-display text-5xl">Finalizar compra</h1>
      <div className="mt-8"><CheckoutForm /></div>
    </div>
  );
}
