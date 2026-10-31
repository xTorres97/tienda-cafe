/** Tarjetas de prueba de la pasarela simulada (mismos números que usa Stripe en modo test). */
export const TEST_CARDS = [
  { number: "4242424242424242", outcome: "succeeded", label: "Pago aprobado" },
  { number: "4000000000003220", outcome: "requires_action", label: "Pide verificación del banco" },
  { number: "4000000000000002", outcome: "card_declined", label: "Tarjeta rechazada" },
  { number: "4000000000009995", outcome: "insufficient_funds", label: "Fondos insuficientes" },
  { number: "4000000000000069", outcome: "expired_card", label: "Tarjeta vencida" },
] as const;

export type CardOutcome = (typeof TEST_CARDS)[number]["outcome"];

export const FAILURE_MESSAGES: Record<string, string> = {
  card_declined: "El banco rechazó la tarjeta. Prueba con otra.",
  insufficient_funds: "La tarjeta no tiene fondos suficientes.",
  expired_card: "La tarjeta está vencida.",
  authentication_failed: "No se pudo verificar el pago con el banco.",
};

/** Algoritmo de Luhn: detecta errores de tipeo en números de tarjeta. */
export function luhn(num: string) {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string) {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  return "tarjeta";
}
