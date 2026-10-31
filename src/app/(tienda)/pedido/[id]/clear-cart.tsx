"use client";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/** Vacía el carrito cuando el pago ya se confirmó. */
export function ClearCart() {
  useEffect(() => { useCart.getState().clear(); }, []);
  return null;
}
