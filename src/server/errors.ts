/** Errores de negocio con un código estable para mostrarlos en la interfaz. */
export class ShopError extends Error {
  constructor(public code: ShopErrorCode, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "ShopError";
  }
}

export type ShopErrorCode =
  | "invalid_input"
  | "out_of_stock"
  | "product_unavailable"
  | "order_not_found"
  | "order_expired"
  | "order_not_payable"
  | "payment_not_found"
  | "card_invalid"
  | "invalid_transition"
  | "invalid_signature";
