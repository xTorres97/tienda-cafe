import Link from "next/link";
import { cookies } from "next/headers";
import { LogOut } from "lucide-react";
import { SESSION_COOKIE, verifySession } from "@/server/auth";
import { logoutAction } from "./actions";
import { Logo } from "@/components/shop/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return <>{children}</>; // pantalla de login
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Logo />
          <nav className="flex gap-1 text-[15px] font-medium" aria-label="Panel">
            <Link href="/admin" className="rounded-full px-3.5 py-2 hover:bg-fern">Pedidos</Link>
            <Link href="/admin/productos" className="rounded-full px-3.5 py-2 hover:bg-fern">Productos</Link>
          </nav>
          <form action={logoutAction} className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{session.email}</span>
            <button className="flex size-10 items-center justify-center rounded-full hover:bg-fern" aria-label="Cerrar sesión"><LogOut className="size-4" /></button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
