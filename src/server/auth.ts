import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sb_admin";
const MAX_AGE = 60 * 60 * 8; // 8 horas

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres");
  return new TextEncoder().encode(s);
}

export async function createSession(email: string) {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.role === "admin" ? { email: payload.sub as string } : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };

/** Compara credenciales en tiempo constante. */
export function checkCredentials(email: string, password: string) {
  const enc = (s: string) => new TextEncoder().encode(s);
  const eq = (a: string, b: string) => {
    const x = enc(a), y = enc(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    return diff === 0;
  };
  const okEmail = eq(email.trim().toLowerCase(), (process.env.ADMIN_EMAIL ?? "").toLowerCase());
  const okPass = eq(password, process.env.ADMIN_PASSWORD ?? "");
  return okEmail && okPass && !!process.env.ADMIN_PASSWORD;
}
