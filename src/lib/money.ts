/** Todo el dinero se maneja en centavos (enteros) para evitar errores de redondeo. */
export const formatUSD = (cents: number) =>
  new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" }).format(cents / 100);

export const SHIPPING_CENTS = 500;
export const FREE_SHIPPING_FROM_CENTS = 4000;
export const RESERVATION_MINUTES = 15;
export const MAX_QTY_PER_LINE = 10;

export function shippingFor(method: "retiro" | "envio", subtotalCents: number) {
  if (method === "retiro") return 0;
  return subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
}

export const GRIND_LABELS = {
  grano: "En grano",
  espresso: "Molido para espresso",
  media: "Molienda media (filtro)",
  gruesa: "Molienda gruesa (prensa francesa)",
} as const;

export const ROAST_LABELS = { claro: "Tueste claro", medio: "Tueste medio", oscuro: "Tueste oscuro" } as const;
export const PROCESS_LABELS = { lavado: "Lavado", natural: "Natural", honey: "Honey" } as const;
