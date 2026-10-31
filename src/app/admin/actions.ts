"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { SESSION_COOKIE, checkCredentials, createSession, sessionCookieOptions, verifySession } from "@/server/auth";
import { setOrderStatus, setProductActive, updateVariant } from "@/server/admin";
import { ShopError } from "@/server/errors";

/** Las server actions son endpoints públicos: cada una verifica la sesión por su cuenta. */
async function requireAdmin() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  return session;
}

export async function loginAction(_prev: { error?: string } | null, fd: FormData) {
  const email = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");
  if (!checkCredentials(email, password)) {
    await new Promise(r => setTimeout(r, 400)); // frena intentos por fuerza bruta
    return { error: "Email o contraseña incorrectos." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSession(email.trim().toLowerCase()), sessionCookieOptions);
  const next = String(fd.get("next") ?? "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function setStatusAction(orderId: string, next: OrderStatus) {
  await requireAdmin();
  try {
    await setOrderStatus(await getDb(), orderId, next);
  } catch (e) {
    return { error: e instanceof ShopError ? e.message : "No se pudo actualizar el pedido" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateVariantAction(variantId: number, stock: number, priceCents: number) {
  await requireAdmin();
  try {
    await updateVariant(await getDb(), variantId, { stock, priceCents });
  } catch (e) {
    return { error: e instanceof ShopError ? e.message : "No se pudo guardar" };
  }
  revalidatePath("/admin/productos");
  return { ok: true };
}

export async function toggleProductAction(productId: number, active: boolean) {
  await requireAdmin();
  await setProductActive(await getDb(), productId, active);
  revalidatePath("/admin/productos");
  return { ok: true };
}
