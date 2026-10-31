import type { DB } from "@/db/types";

export type CardInput = { number: string; expMonth: number; expYear: number; cvc: string; name: string };

export type PaymentResult =
  | { status: "succeeded" }
  | { status: "requires_action" }
  | { status: "failed"; failureCode: string };

/**
 * Contrato de una pasarela de pago. La pasarela simulada lo implementa hoy;
 * Stripe o Mercado Pago podrían implementarlo sin tocar el checkout ni el panel.
 */
export interface PaymentProvider {
  readonly name: string;
  pay(db: DB, paymentId: string, card: CardInput, now?: Date): Promise<PaymentResult>;
  confirmAction(db: DB, paymentId: string, approved: boolean, now?: Date): Promise<PaymentResult>;
}
