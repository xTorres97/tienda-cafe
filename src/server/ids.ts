import { randomBytes } from "node:crypto";

/** Ids difíciles de adivinar con prefijo legible, al estilo de Stripe (ord_…, pay_…). */
export function newId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}
