import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Sombra de Bucare · Café de especialidad venezolano", template: "%s · Sombra de Bucare" },
  description: "Café de especialidad de fincas de los Andes y la costa venezolana. Tostado cada semana, envíos a todo el país. Tienda de demostración.",
  openGraph: { type: "website", locale: "es_VE", siteName: "Sombra de Bucare" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster position="bottom-center" toastOptions={{ classNames: { toast: "!rounded-2xl !bg-forest !text-mist !border-0 !font-sans" } }} />
      </body>
    </html>
  );
}
