import type { Metadata } from "next";
import { Logo } from "@/components/shop/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Panel · Iniciar sesión", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // En la demo pública las credenciales se muestran a propósito; los datos se restablecen cada noche
  const demo = process.env.DEMO_MODE === "1" ? { email: process.env.ADMIN_EMAIL ?? "", password: process.env.ADMIN_PASSWORD ?? "" } : undefined;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 font-display text-3xl">Panel de la tienda</h1>
        <p className="mt-2 text-muted">Pedidos, inventario y precios.</p>
        <div className="mt-8"><LoginForm next={next ?? "/admin"} demo={demo} /></div>
      </div>
    </div>
  );
}
